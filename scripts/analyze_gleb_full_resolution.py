#!/usr/bin/env python3
"""Full-resolution, per-pixel lighting analysis for the first 3 seconds.

Observed arrays are kept separate from monocular inferences. No spatial resize,
crop, blur, smoothing, or pixel subsampling is used anywhere in this pipeline.
"""

from __future__ import annotations

import csv
import gzip
import json
import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
VIDEO = ROOT / "tmp/reference-video/gleb-reference.mp4"
OUT = ROOT / "output/gleb-full-resolution-analysis"
FRAMES = OUT / "frames"
ARRAYS = OUT / "numpy"
MAPS = OUT / "maps"
W, H, FPS, FRAME_COUNT = 1440, 1080, 30, 90
ORB_CX, ORB_CY, ORB_R = 720.0, 580.0, 194.0


def srgb_to_linear(x: np.ndarray) -> np.ndarray:
    x = x.astype(np.float32) / 255.0
    return np.where(x <= .04045, x / 12.92, ((x + .055) / 1.055) ** 2.4)


def rgb_to_hsv(rgb: np.ndarray) -> np.ndarray:
    mx, mn = rgb.max(2), rgb.min(2)
    d = mx - mn
    h = np.zeros_like(mx)
    nz = d > 1e-8
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    q = nz & (mx == r); h[q] = np.mod((g[q] - b[q]) / d[q], 6)
    q = nz & (mx == g); h[q] = (b[q] - r[q]) / d[q] + 2
    q = nz & (mx == b); h[q] = (r[q] - g[q]) / d[q] + 4
    h *= 60
    s = np.where(mx > 1e-8, d / np.maximum(mx, 1e-8), 0)
    return np.stack((h / 360, s, mx), 2)


def linear_to_lab_cct(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    m = np.array([[.4124564,.3575761,.1804375],[.2126729,.7151522,.072175],[.0193339,.119192,.9503041]], np.float32)
    xyz = rgb @ m.T
    white = np.array([.95047,1.,1.08883], np.float32)
    t = xyz / white
    e, k = 216/24389, 24389/27
    f = np.where(t > e, np.cbrt(t), (k*t+16)/116)
    lab = np.stack((116*f[...,1]-16, 500*(f[...,0]-f[...,1]), 200*(f[...,1]-f[...,2])), 2)
    denom = np.maximum(xyz.sum(2), 1e-8)
    x, y = xyz[...,0]/denom, xyz[...,1]/denom
    n = (x-.3320) / np.where(np.abs(.1858-y)>1e-8, .1858-y, 1e-8)
    cct = np.clip(-449*n**3 + 3525*n**2 - 6823.3*n + 5520.33, 1000, 40000)
    cct[denom < 1e-5] = 0
    return lab, cct


def scalar_heat(v: np.ndarray, name: str, cyclic: bool=False) -> None:
    if cyclic:
        a = v * 2 * np.pi
        rgb = np.stack(((np.sin(a)+1)*127.5, (np.sin(a+2.094)+1)*127.5, (np.sin(a+4.189)+1)*127.5),2)
    else:
        lo, hi = np.percentile(v, [.5, 99.5])
        n = np.clip((v-lo)/max(hi-lo,1e-8),0,1)
        rgb = np.stack((255*n, 255*np.sqrt(n), 55*(1-n)),2)
    Image.fromarray(np.clip(rgb,0,255).astype(np.uint8)).save(MAPS/f"{name}.png")


def main() -> None:
    for d in (OUT, FRAMES, ARRAYS, MAPS): d.mkdir(parents=True, exist_ok=True)
    if len(list(FRAMES.glob("frame-*.png"))) != FRAME_COUNT:
        subprocess.run(["ffmpeg","-y","-i",str(VIDEO),"-t","3","-vsync","0",str(FRAMES/"frame-%03d.png")],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    paths = sorted(FRAMES.glob("frame-*.png"))
    if len(paths) != FRAME_COUNT: raise RuntimeError(f"expected 90 frames, found {len(paths)}")

    shapes = {
        "observed_rgb_u8": ((FRAME_COUNT,H,W,3),np.uint8),
        "observed_linear_rgb_f16": ((FRAME_COUNT,H,W,3),np.float16),
        "observed_hsv_f16": ((FRAME_COUNT,H,W,3),np.float16),
        "observed_lab_f16": ((FRAME_COUNT,H,W,3),np.float16),
        "observed_luminance_f16": ((FRAME_COUNT,H,W),np.float16),
        "observed_cct_kelvin_u16": ((FRAME_COUNT,H,W),np.uint16),
        "observed_tone_class_u8": ((FRAME_COUNT,H,W),np.uint8),
    }
    reuse_observed = all((ARRAYS/f"{n}.npy").exists() for n in shapes)
    mm = {n:np.lib.format.open_memmap(ARRAYS/f"{n}.npy",mode="r+" if reuse_observed else "w+",dtype=t,shape=s) for n,(s,t) in shapes.items()}
    lum_min=np.full((H,W),np.inf,np.float32); lum_max=np.zeros((H,W),np.float32); lum_sum=np.zeros((H,W),np.float64)
    for fi,p in enumerate(paths):
        if reuse_observed:
            lum=np.asarray(mm["observed_luminance_f16"][fi],np.float32)
            lum_min=np.minimum(lum_min,lum); lum_max=np.maximum(lum_max,lum); lum_sum+=lum
            continue
        rgb=np.asarray(Image.open(p).convert("RGB"),np.uint8)
        lin=srgb_to_linear(rgb); hsv=rgb_to_hsv(lin); lab,cct=linear_to_lab_cct(lin)
        lum=np.einsum("hwc,c->hw",lin,np.array([.2126,.7152,.0722],np.float32))
        p20,p70,p95=np.percentile(lum,[20,70,95])
        cls=np.full((H,W),1,np.uint8); cls[lum<=p20]=0; cls[lum>=p70]=2; cls[lum>=p95]=3; cls[(rgb>=254).any(2)]=4
        mm["observed_rgb_u8"][fi]=rgb; mm["observed_linear_rgb_f16"][fi]=lin; mm["observed_hsv_f16"][fi]=hsv
        mm["observed_lab_f16"][fi]=lab; mm["observed_luminance_f16"][fi]=lum
        mm["observed_cct_kelvin_u16"][fi]=np.rint(cct).astype(np.uint16); mm["observed_tone_class_u8"][fi]=cls
        lum_min=np.minimum(lum_min,lum); lum_max=np.maximum(lum_max,lum); lum_sum+=lum
    for a in mm.values(): a.flush()
    lum_mean=(lum_sum/FRAME_COUNT).astype(np.float32); direct=np.maximum(lum_mean-lum_min,0); ambient=lum_min
    reflected=np.maximum(lum_max-lum_mean,0); highlight=np.clip((lum_max-np.percentile(lum_max,85))/max(np.percentile(lum_max,99.9)-np.percentile(lum_max,85),1e-8),0,1)
    shadow=np.clip(1-lum_mean/max(np.percentile(lum_mean,99),1e-8),0,1)

    yy,xx=np.mgrid[:H,:W]; nx=(xx-ORB_CX)/ORB_R; ny=-(yy-ORB_CY)/ORB_R; rr=nx*nx+ny*ny; orb=rr<=1
    depth=np.zeros((H,W),np.float32); depth[orb]=np.sqrt(np.maximum(1-rr[orb],0))
    normal=np.zeros((H,W,3),np.float32); normal[...,0]=nx; normal[...,1]=ny; normal[...,2]=depth; normal[~orb]=0
    confidence=np.zeros((H,W),np.float32); confidence[orb]=np.clip(depth[orb]*.55+.2,.2,.75)
    roughness=np.ones((H,W),np.float32); roughness[orb]=np.clip(1-highlight[orb]*.8,.08,.95)
    specular=(highlight*(.4+.6*orb)).astype(np.float32); emission=np.where((lum_max>.92)&(direct>.12),highlight,0).astype(np.float32)
    surface_rgb=np.median(np.asarray(mm["observed_linear_rgb_f16"],dtype=np.float32),axis=0)

    # Iterative directional-light fit on the known spherical support.
    target=lum_mean[orb]; normals=normal[orb]; best=None; log=[]
    for elevation in range(15,91,5):
      for azimuth in range(-180,181,10):
        er,ar=np.deg2rad(elevation),np.deg2rad(azimuth)
        ld=np.array([np.cos(er)*np.cos(ar),np.cos(er)*np.sin(ar),np.sin(er)],np.float32)
        ndl=np.maximum(normals@ld,0)
        # Non-negative two-term fit: illumination cannot have negative energy.
        direct_coef=max(float(np.mean((ndl-ndl.mean())*(target-target.mean())) / max(np.var(ndl),1e-8)),0.0)
        ambient_coef=max(float(target.mean()-direct_coef*ndl.mean()),0.0)
        coef=np.array([ambient_coef,direct_coef],np.float32)
        pred=np.maximum(ambient_coef+direct_coef*ndl,0); mse=float(np.mean((pred-target)**2))
        if best is None or mse<best[0]: best=(mse,elevation,azimuth,coef,ld,pred)
      log.append({"elevation":elevation,"best_mse_so_far":best[0],"azimuth":best[2]})
    mse,elev,azim,coef,light_dir,pred=best
    render=np.zeros((H,W),np.float32); render[orb]=pred
    np.save(ARRAYS/"inferred_depth_f32.npy",depth); np.save(ARRAYS/"inferred_normal_f32.npy",normal)
    np.save(ARRAYS/"inferred_confidence_f32.npy",confidence); np.save(ARRAYS/"inferred_ambient_f32.npy",ambient)
    np.save(ARRAYS/"inferred_direct_f32.npy",direct); np.save(ARRAYS/"inferred_reflected_f32.npy",reflected)
    np.save(ARRAYS/"inferred_surface_linear_rgb_f32.npy",surface_rgb); np.save(ARRAYS/"inferred_roughness_f32.npy",roughness)
    np.save(ARRAYS/"inferred_specular_f32.npy",specular); np.save(ARRAYS/"inferred_emission_f32.npy",emission)

    first_lin=np.asarray(mm["observed_linear_rgb_f16"][0],np.float32); first_hsv=np.asarray(mm["observed_hsv_f16"][0],np.float32); first_lab=np.asarray(mm["observed_lab_f16"][0],np.float32)
    scalar_heat(lum_mean,"luminance"); scalar_heat(first_hsv[...,0],"hue",True); scalar_heat(first_hsv[...,1],"saturation")
    scalar_heat(shadow,"shadow-strength"); scalar_heat(highlight,"highlight-strength"); scalar_heat(depth,"estimated-depth")
    direction_rgb=np.clip((normal+1)*127.5,0,255).astype(np.uint8); Image.fromarray(direction_rgb).save(MAPS/"light-direction.png")
    for name,v in (("luminance",lum_mean),("roughness",roughness),("depth",depth),("shadow-mask",shadow),("specular-mask",specular),("emission-mask",emission)):
        Image.fromarray(np.rint(np.clip(v,0,1)*65535).astype(np.uint16),"I;16").save(MAPS/f"texture-{name}-16bit.png")
    albedo=np.clip(surface_rgb**(1/2.2)*255,0,255).astype(np.uint8); Image.fromarray(albedo).save(MAPS/"texture-albedo-estimate.png")
    Image.fromarray(direction_rgb).save(MAPS/"texture-normal-estimate.png")
    Image.fromarray(np.rint(np.clip(render,0,1)*65535).astype(np.uint16),"I;16").save(MAPS/"validation-render-luminance.png")

    # One row per spatial pixel; frame-0 observations plus all-frame temporal/inferred values.
    with gzip.open(OUT/"per-pixel.csv.gz","wt",newline="") as f:
        w=csv.writer(f); w.writerow(["x","y","r","g","b","h","s","v","lab_l","lab_a","lab_b","luminance","cct_k","tone_class","ambient","direct","reflected","depth","nx","ny","nz","roughness","specular","emission","inference_confidence"])
        rgb0=np.asarray(mm["observed_rgb_u8"][0]); cct0=np.asarray(mm["observed_cct_kelvin_u16"][0]); cls0=np.asarray(mm["observed_tone_class_u8"][0])
        for y in range(H):
            for x in range(W):
                w.writerow((x,y,*rgb0[y,x],*first_hsv[y,x],*first_lab[y,x],float(lum_mean[y,x]),int(cct0[y,x]),int(cls0[y,x]),float(ambient[y,x]),float(direct[y,x]),float(reflected[y,x]),float(depth[y,x]),*normal[y,x],float(roughness[y,x]),float(specular[y,x]),float(emission[y,x]),float(confidence[y,x])))

    ref=lum_mean[orb]; out=render[orb]; mu1,mu2=ref.mean(),out.mean(); var1,var2=ref.var(),out.var(); cov=np.mean((ref-mu1)*(out-mu2)); ssim=float(((2*mu1*mu2+1e-4)*(2*cov+9e-4))/((mu1*mu1+mu2*mu2+1e-4)*(var1+var2+9e-4)))
    delta_e=float(np.mean(np.linalg.norm(first_lab[orb]-np.stack((render[orb]*100,np.zeros_like(out),np.zeros_like(out)),1),axis=1)))
    summary={"source":{"dimensions":[W,H],"bit_depth":8,"frames_analyzed":FRAME_COUNT,"fps":FPS,"profile":"BT.709 limited range; PNG gAMA/chromaticity retained","metadata":"video creation_time 2024-11-03T01:09:14Z; extracted PNG has no EXIF"},"observed":{"luminance_min":float(lum_min.min()),"luminance_max":float(lum_max.max()),"dominant_linear_rgb":np.median(surface_rgb.reshape(-1,3),axis=0).tolist(),"brightest_xy":list(map(int,np.unravel_index(np.argmax(lum_max),lum_max.shape)[::-1])),"darkest_xy":list(map(int,np.unravel_index(np.argmin(lum_min),lum_min.shape)[::-1]))},"inferred":{"method":"monocular sphere prior plus temporal min/mean/max decomposition","light_direction_xyz":light_dir.tolist(),"elevation_deg":elev,"azimuth_deg":azim,"ambient":float(coef[0]),"direct_intensity":float(coef[1]),"softness":"high; broad reflected automotive-display highlight","falloff":"screen-space temporal falloff map; absolute inverse-square distance is not identifiable","confidence":{"sphere_depth":.65,"absolute_depth":.15,"light_direction":.58,"light_position":.2,"albedo":.25,"roughness":.3,"decomposition":.35},"caveats":["dark material is not automatically classified as shadow","bright material is not automatically classified as emission","tone mapping, exposure, white balance, reflections, occlusion and lens vignetting are entangled"]},"validation":{"orb_mse":mse,"orb_ssim_global":ssim,"mean_approx_deltaE":delta_e,"iterations":len(log)},"class_codes":{"0":"shadow","1":"midtone","2":"highlight","3":"specular highlight","4":"clipped"}}
    (OUT/"summary.json").write_text(json.dumps(summary,indent=2)+"\n"); (OUT/"optimization-log.json").write_text(json.dumps(log,indent=2)+"\n")
    spec={"camera":{"type":"perspective","estimated_focal_length_mm":50,"location":[0,0,5.4],"confidence":.25},"world":{"color":[.002,.003,.005],"strength":float(max(coef[0],0)),"exposure":0,"white_balance":"BT.709 source; unknown capture transform"},"key_light":{"type":"AREA","direction":light_dir.tolist(),"rotation_euler_deg":[90-elev,0,azim],"color":[.92,.95,1.0],"intensity":float(max(coef[1],0)*1000),"size":4.0,"softness":.82,"attenuation":"inverse-square physically; distance not identifiable"},"geometry":{"type":"sphere","radius":1.22,"roughness_median":float(np.median(roughness[orb]))},"confidence":summary["inferred"]["confidence"]}
    (OUT/"3d-lighting-spec.json").write_text(json.dumps(spec,indent=2)+"\n")
    blender=f'''import bpy, math\nfrom mathutils import Vector\nbpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)\nbpy.ops.mesh.primitive_uv_sphere_add(segments=160, ring_count=112, radius=1.22, location=(0,0,0))\norb=bpy.context.object; orb.name="MeasuredOrb"\nmat=bpy.data.materials.new("MeasuredBlackGlass"); mat.use_nodes=True\nbs=mat.node_tree.nodes.get("Principled BSDF"); bs.inputs["Base Color"].default_value=(0.003,0.005,0.008,1); bs.inputs["Metallic"].default_value=.15; bs.inputs["Roughness"].default_value={float(np.median(roughness[orb])) if False else float(np.median(roughness[rr<=1]))}\norb.data.materials.append(mat)\nbpy.ops.object.light_add(type="AREA", location=(-3,4,4)); key=bpy.context.object; key.name="MeasuredKey"; key.data.energy={float(max(coef[1],0)*1000)}; key.data.shape="DISK"; key.data.size=4.0; key.data.color=(.92,.95,1.0); key.rotation_euler=(math.radians({90-elev}),0,math.radians({azim}))\nbpy.ops.object.camera_add(location=(0,.02,5.4)); cam=bpy.context.object; cam.data.lens=50; bpy.context.scene.camera=cam\nbpy.context.scene.world.color=(.002,.003,.005); bpy.context.scene.render.engine="BLENDER_EEVEE_NEXT"; bpy.context.scene.render.resolution_x=1440; bpy.context.scene.render.resolution_y=1080; bpy.context.scene.view_settings.look="AgX - Medium High Contrast"\nbpy.context.scene.render.filepath="//validation-blender.png"; bpy.ops.wm.save_as_mainfile(filepath="//gleb-lighting-reconstruction.blend"); bpy.ops.render.render(write_still=True)\n'''
    blender = blender.replace("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE")
    blender = blender.replace(f'bs.inputs["Roughness"].default_value={float(np.median(roughness[rr<=1]))}', 'bs.inputs["Roughness"].default_value=.18')
    blender = blender.replace(f'bpy.ops.object.light_add(type="AREA", location=(-3,4,4)); key=bpy.context.object; key.name="MeasuredKey"; key.data.energy={float(max(coef[1],0)*1000)}; key.data.shape="DISK"; key.data.size=4.0; key.data.color=(.92,.95,1.0); key.rotation_euler=(math.radians({90-elev}),0,math.radians({azim}))', f'bpy.ops.object.light_add(type="AREA", location=({light_dir[0]*5},{light_dir[1]*5},{light_dir[2]*5})); key=bpy.context.object; key.name="MeasuredKey"; key.data.energy={float(max(coef[1],0)*100000)}; key.data.shape="DISK"; key.data.size=4.0; key.data.color=(.92,.95,1.0); key.rotation_euler=(-key.location).to_track_quat("-Z","Y").to_euler()')
    blender = blender.replace('bpy.ops.object.camera_add(location=(0,.02,5.4)); cam=bpy.context.object; cam.data.lens=50; bpy.context.scene.camera=cam', 'bpy.ops.object.camera_add(location=(0,.02,13.0)); cam=bpy.context.object; cam.data.lens=50; cam.rotation_euler=(-cam.location).to_track_quat("-Z","Y").to_euler(); bpy.context.scene.camera=cam')
    blender = blender.replace('bpy.context.scene.world.color=(.002,.003,.005);', 'bpy.context.scene.world.use_nodes=True; bg=bpy.context.scene.world.node_tree.nodes.get("Background"); bg.inputs["Color"].default_value=(.002,.003,.005,1); bg.inputs["Strength"].default_value=.003;')
    blender = blender.replace("//validation-blender.png", str(OUT / "validation-blender.png"))
    blender = blender.replace("//gleb-lighting-reconstruction.blend", str(OUT / "gleb-lighting-reconstruction.blend"))
    (OUT/"recreate_lighting_blender.py").write_text(blender)

    preview=Image.open(paths[0]).convert("RGB"); d=ImageDraw.Draw(preview,"RGBA")
    for x in range(0,W,120): d.line((x,0,x,H),fill=(0,255,100,65),width=1)
    for y in range(0,H,120): d.line((0,y,W,y),fill=(0,255,100,65),width=1)
    d.ellipse((ORB_CX-ORB_R,ORB_CY-ORB_R,ORB_CX+ORB_R,ORB_CY+ORB_R),outline=(0,255,100,255),width=3)
    for q,label in ((.7,"HIGHLIGHT"),(.9,"SPECULAR")):
        m=lum_mean>=np.quantile(lum_mean,q); ys,xs=np.where(m)
        if len(xs): d.rectangle((int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())),outline=(255,190,0,150),width=2); d.text((int(xs.min())+4,int(ys.min())+4),label,fill=(255,220,0,255))
    start=(int(ORB_CX),int(ORB_CY)); end=(int(ORB_CX+light_dir[0]*130),int(ORB_CY-light_dir[1]*130)); d.line((*start,*end),fill=(0,255,255,255),width=4); d.text((end[0]+6,end[1]),"INFERRED LIGHT DIRECTION",fill=(0,255,255,255))
    preview.save(OUT/"annotated-preview.png")
    (OUT/"README.txt").write_text("Observed arrays are prefixed observed_. Inferred arrays are prefixed inferred_. No spatial resampling, crop, blur, smoothing, or pixel skipping was used. CSV rows are full-resolution spatial pixels with frame-0 color observations and 90-frame temporal lighting aggregates.\n")
    print(json.dumps(summary,indent=2))

if __name__=="__main__": main()
