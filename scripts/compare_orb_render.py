#!/usr/bin/env python3
"""Pixel comparison between a deterministic browser orb render and source frame."""
from __future__ import annotations
import argparse, json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
SRC_DIR=ROOT/"output/gleb-full-resolution-analysis/frames"
SRC_BOX=(520,380,920,780)

def linear(a):
 a=a.astype(np.float32)/255; return np.where(a<=.04045,a/12.92,((a+.055)/1.055)**2.4)
def lab(rgb):
 x=linear(rgb); m=np.array([[.4124564,.3575761,.1804375],[.2126729,.7151522,.072175],[.0193339,.119192,.9503041]],np.float32); xyz=x@m.T; t=xyz/np.array([.95047,1,1.08883]); e=216/24389; k=24389/27; f=np.where(t>e,np.cbrt(t),(k*t+16)/116); return np.stack((116*f[...,1]-16,500*(f[...,0]-f[...,1]),200*(f[...,1]-f[...,2])),2)
def main():
 p=argparse.ArgumentParser(); p.add_argument("render"); p.add_argument("--out",required=True); p.add_argument("--source-frame",type=int,default=1); a=p.parse_args(); out=Path(a.out); out.mkdir(parents=True,exist_ok=True)
 source=SRC_DIR/f"frame-{a.source_frame:03d}.png"
 cur=Image.open(a.render).convert("RGB"); ref=Image.open(source).convert("RGB").crop(SRC_BOX).resize(cur.size,Image.Resampling.LANCZOS)
 A=np.asarray(ref); B=np.asarray(cur); al=linear(A); bl=linear(B); d=np.abs(al-bl); de=np.linalg.norm(lab(A)-lab(B),axis=2)
 yy,xx=np.mgrid[:cur.height,:cur.width]; mask=(xx-(cur.width-1)/2)**2+(yy-(cur.height-1)/2)**2<=(min(cur.size)*.485)**2
 mse=float(np.mean((al[mask]-bl[mask])**2)); mae=float(d[mask].mean())
 ya=np.einsum('hwc,c->hw',al,[.2126,.7152,.0722]); yb=np.einsum('hwc,c->hw',bl,[.2126,.7152,.0722]); pa,pb=ya[mask],yb[mask]; m1,m2=pa.mean(),pb.mean(); v1,v2=pa.var(),pb.var(); cov=np.mean((pa-m1)*(pb-m2)); ssim=float(((2*m1*m2+1e-4)*(2*cov+9e-4))/((m1*m1+m2*m2+1e-4)*(v1+v2+9e-4)))
 metrics={"render":str(Path(a.render)),"source":str(source),"dimensions":cur.size,"comparison_mask":"orb circle r=0.485*width","pixel_count":int(mask.sum()),"linear_rgb_mse":mse,"linear_rgb_mae":mae,"global_luminance_ssim":ssim,"mean_deltaE76":float(de[mask].mean()),"p95_deltaE76":float(np.percentile(de[mask],95)),"exact_srgb_pixel_fraction":float(np.all(A[mask]==B[mask],1).mean())}
 (out/"metrics.json").write_text(json.dumps(metrics,indent=2)+"\n")
 Image.blend(ref,cur,.5).save(out/"overlay.png")
 heat=np.zeros((*de.shape,3),np.uint8); heat[...,0]=np.clip(de*8,0,255).astype(np.uint8); heat[...,1]=np.clip((de-2)*2,0,150).astype(np.uint8); heat[~mask]=0; Image.fromarray(heat).save(out/"deltaE-heatmap.png")
 sheet=Image.new("RGB",(cur.width*3,cur.height),(0,0,0)); sheet.paste(ref,(0,0)); sheet.paste(cur,(cur.width,0)); sheet.paste(Image.fromarray(heat),(cur.width*2,0)); dr=ImageDraw.Draw(sheet); dr.text((8,8),"SOURCE",fill="white"); dr.text((cur.width+8,8),"CURRENT",fill="white"); dr.text((cur.width*2+8,8),"DELTA E",fill="white"); sheet.save(out/"comparison.png")
 print(json.dumps(metrics,indent=2))
if __name__=="__main__": main()
