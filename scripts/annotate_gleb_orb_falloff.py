#!/usr/bin/env python3
"""Dense, unsmoothed falloff annotation for the measured Gleb orb."""

from __future__ import annotations

import csv
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "output/gleb-full-resolution-analysis"
OUT = BASE / "falloff-annotation"
CX, CY, R = 720, 580, 194
CONTOUR_PERCENTILES = [10, 25, 40, 55, 70, 82, 90, 96, 99]
COLORS = [(30,70,255),(0,165,255),(0,235,220),(0,255,95),(180,255,0),(255,230,0),(255,150,0),(255,55,25),(255,0,180)]


def boundary(mask: np.ndarray) -> np.ndarray:
    b = np.zeros_like(mask)
    b[1:, :] |= mask[1:, :] != mask[:-1, :]
    b[:-1, :] |= mask[:-1, :] != mask[1:, :]
    b[:, 1:] |= mask[:, 1:] != mask[:, :-1]
    b[:, :-1] |= mask[:, :-1] != mask[:, 1:]
    return b


def extrema(field: np.ndarray, mask: np.ndarray, brightest: bool) -> list[tuple[int,int,float]]:
    values = field.copy(); values[~mask] = -np.inf if brightest else np.inf
    flat = values.ravel()
    ids = np.argpartition(flat, -12000 if brightest else 12000)[-12000:] if brightest else np.argpartition(flat, 12000)[:12000]
    ids = ids[np.argsort(flat[ids])[::-1 if brightest else 1]]
    selected=[]
    for idx in ids:
        y,x=divmod(int(idx),field.shape[1])
        if all((x-px)**2+(y-py)**2>28**2 for px,py,_ in selected):
            selected.append((x,y,float(field[y,x])))
            if len(selected)==8: break
    return selected


def main() -> None:
    OUT.mkdir(parents=True,exist_ok=True)
    rgb=np.asarray(Image.open(BASE/"frames/frame-001.png").convert("RGB"))
    lum_stack=np.load(BASE/"numpy/observed_luminance_f16.npy",mmap_mode="r")
    lum=np.asarray(lum_stack,dtype=np.float32).mean(0)
    yy,xx=np.mgrid[:1080,:1440]; radius=np.sqrt((xx-CX)**2+(yy-CY)**2); orb=radius<=R
    ui=np.zeros_like(orb)
    ui[520:675,660:785]=True       # central speed readout and unit
    ui[555:610,555:610]=True       # drive-mode glyph
    ui[574:588,610:905]=True       # horizontal dotted readout axis
    ui |= (radius>=158)&(radius<=193)&(yy>=600)  # lower dotted gauge
    optical=orb&~ui
    gy,gx=np.gradient(lum)  # exact adjacent-pixel finite differences; no smoothing
    grad=np.hypot(gx,gy); levels=np.percentile(lum[optical],CONTOUR_PERCENTILES)

    overlay=rgb.astype(np.float32)*.50
    contour_counts={}
    for pct,level,color in zip(CONTOUR_PERCENTILES,levels,COLORS):
        edge=boundary(lum>=level)&optical
        overlay[edge]=color; contour_counts[str(pct)]=int(edge.sum())
    image=Image.fromarray(np.clip(overlay,0,255).astype(np.uint8)); d=ImageDraw.Draw(image,"RGBA"); font=ImageFont.load_default()
    d.ellipse((CX-R,CY-R,CX+R,CY+R),outline=(0,255,100,255),width=2)

    # Radial transects and exact per-sample CSV.
    rows=[]; angle_summary=[]
    for degree in range(360):
        a=np.deg2rad(degree); radii=np.arange(R+1)
        xs=np.rint(CX+np.cos(a)*radii).astype(int); ys=np.rint(CY-np.sin(a)*radii).astype(int)
        vals=lum[ys,xs]; deriv=np.diff(vals,prepend=vals[0]); absd=np.abs(deriv)
        usable=np.arange(4,R-3)
        usable=usable[~ui[ys[usable],xs[usable]]]
        steep=int(usable[np.argmax(absd[usable])]); nonzero=usable[absd[usable]>1e-6]
        shallow=int(nonzero[np.argmin(absd[nonzero])]) if len(nonzero) else 4
        angle_summary.append({"angle_deg":degree,"steepest_radius":steep,"steepest_signed_dL_dr":float(deriv[steep]),"shallowest_radius":shallow,"shallowest_abs_dL_dr":float(absd[shallow]),"centre_luminance":float(vals[0]),"edge_luminance":float(vals[-1])})
        for r,x,y,v,dv in zip(radii,xs,ys,vals,deriv): rows.append((degree,int(r),int(x),int(y),float(v),float(dv),int(rgb[y,x,0]),int(rgb[y,x,1]),int(rgb[y,x,2]),int(ui[y,x])))
        if degree%15==0:
            ex,ey=int(xs[-1]),int(ys[-1]); d.line((CX,CY,ex,ey),fill=(0,255,180,100),width=1); d.text((ex+3,ey-5),f"{degree}°",font=font,fill=(0,255,180,230))
            sx,sy=int(xs[steep]),int(ys[steep]); d.ellipse((sx-3,sy-3,sx+3,sy+3),fill=(255,45,30,255)); d.line((sx,sy,sx+gx[sy,sx]*1800,sy+gy[sy,sx]*1800),fill=(255,60,30,230),width=2)
            lx,ly=int(xs[shallow]),int(ys[shallow]); d.rectangle((lx-2,ly-2,lx+2,ly+2),fill=(30,145,255,255))

    with (OUT/"radial-falloff-every-degree-every-radius.csv").open("w",newline="") as f:
        w=csv.writer(f); w.writerow(["angle_deg","radius_px","x","y","temporal_mean_luminance","signed_dL_dr","r","g","b","excluded_ui_pixel"]); w.writerows(rows)
    with (OUT/"falloff-angle-summary.csv").open("w",newline="") as f:
        w=csv.DictWriter(f,fieldnames=angle_summary[0].keys()); w.writeheader(); w.writerows(angle_summary)

    # Dense local gradient arrows across the orb. Red points toward increasing L.
    for y in range(CY-R+10,CY+R-9,16):
        for x in range(CX-R+10,CX+R-9,16):
            if not optical[y,x] or grad[y,x]<1e-5: continue
            scale=min(13/max(float(grad[y,x]),1e-8),2400)
            d.line((x,y,x+gx[y,x]*scale,y+gy[y,x]*scale),fill=(255,55,35,175),width=1)

    peaks=extrema(lum,optical,True); valleys=extrema(lum,optical,False)
    for i,(x,y,v) in enumerate(peaks,1): d.ellipse((x-6,y-6,x+6,y+6),outline=(255,255,0,255),width=2); d.text((x+8,y-8),f"P{i} L={v:.4f}",fill=(255,255,0,255),font=font)
    for i,(x,y,v) in enumerate(valleys,1): d.rectangle((x-5,y-5,x+5,y+5),outline=(40,155,255,255),width=2); d.text((x+7,y+5),f"V{i} L={v:.5f}",fill=(40,175,255,255),font=font)
    d.rectangle((660,520,785,675),outline=(255,0,255,230),width=2); d.rectangle((555,555,610,610),outline=(255,0,255,230),width=2)
    d.text((790,655),"MAGENTA = UI OBSERVED, EXCLUDED FROM LIGHT INFERENCE",fill=(255,80,255,255),font=font)

    # Legend outside the orb, with measured contour values.
    lx,ly=965,370; d.rectangle((lx-12,ly-18,lx+435,ly+270),fill=(0,0,0,210),outline=(255,255,255,110))
    d.text((lx,ly-8),"ORB FALLOFF — MEASURED, UNSMOOTHED",fill=(255,255,255,255),font=font)
    for i,(pct,level,color) in enumerate(zip(CONTOUR_PERCENTILES,levels,COLORS)):
        y=ly+18+i*20; d.line((lx,y,lx+28,y),fill=(*color,255),width=3); d.text((lx+36,y-5),f"P{pct:02d} iso-L = {level:.6f}",fill=(255,255,255,240),font=font)
    d.text((lx,ly+207),"RED DOT/ARROW: steepest radial falloff + local ∇L",fill=(255,90,65,255),font=font)
    d.text((lx,ly+227),"BLUE SQUARE: lowest non-zero radial falloff",fill=(70,170,255,255),font=font)
    d.text((lx,ly+247),"YELLOW CIRCLE / BLUE BOX: optical peak / valley",fill=(255,255,180,255),font=font)
    image.save(OUT/"full-resolution-falloff-annotated.png")

    # Readable close-up is only a presentation crop; all calculations remain full resolution.
    close=image.crop((CX-R-90,CY-R-90,CX+R+520,CY+R+90))
    close.save(OUT/"orb-falloff-closeup.png")
    np.save(OUT/"observed_temporal_mean_luminance_f32.npy",lum)
    np.save(OUT/"observed_gradient_x_f32.npy",gx); np.save(OUT/"observed_gradient_y_f32.npy",gy); np.save(OUT/"observed_gradient_magnitude_f32.npy",grad)
    summary={"source_dimensions":[1440,1080],"frames":90,"spatial_processing":"none: no crop, resize, blur, smoothing, or pixel skipping","derivative":"adjacent-pixel finite difference","orb":{"centre_xy":[CX,CY],"radius_px":R},"ui_separation":{"rule":"observed UI pixels retained but excluded from optical inference","excluded_pixel_count":int((ui&orb).sum())},"contours":[{"percentile":p,"luminance":float(v),"boundary_pixel_count":contour_counts[str(p)]} for p,v in zip(CONTOUR_PERCENTILES,levels)],"peaks":[{"x":x,"y":y,"luminance":v} for x,y,v in peaks],"valleys":[{"x":x,"y":y,"luminance":v} for x,y,v in valleys],"radial_samples":len(rows),"annotation_key":{"red":"steepest falloff and positive luminance gradient","blue":"lowest non-zero falloff","yellow":"local optical high-luminance region","magenta":"observed UI excluded from light inference"}}
    (OUT/"falloff-summary.json").write_text(json.dumps(summary,indent=2)+"\n")
    print(json.dumps(summary,indent=2))

if __name__=="__main__": main()
