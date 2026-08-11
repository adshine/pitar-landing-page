#!/usr/bin/env python3
"""Refine the first-orb/second-lobe boundary without using the second lobe."""
from __future__ import annotations
import csv,json,subprocess
from io import BytesIO
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/"output/gleb-first-orb-full-video"; FRAME_DIR=ROOT/"output/gleb-full-resolution-analysis/frames"; W,H,FPS=1440,1080,30
def main():
 frames=[np.asarray(Image.open(FRAME_DIR/f"frame-{i:03d}.png").convert("RGB"),np.float32) for i in range(1,91)]
 base=np.median(np.stack(frames[:20]),0)
 yy,xx=np.mgrid[:H,:W]; outside=(xx>=900)&(xx<=1130)&(yy>=430)&(yy<=740)
 values=[]
 for i,f in enumerate(frames):
  values.append(float(np.abs(f-base).mean(2)[outside].mean()))
 values=np.array(values); stable=values[:60]; med=float(np.median(stable)); mad=float(np.median(np.abs(stable-med))); threshold=med+8*max(mad,.03)
 candidates=np.where(values>threshold)[0]; start=int(candidates[0]) if len(candidates) else 60
 for i in range(max(0,start-3),len(values)-2):
  if np.all(values[i:i+3]>threshold): start=i; break
 rows=[{"frame":i+1,"time_s":i/FPS,"outside_second_lobe_rgb_delta":float(v),"first_orb_only":i<start} for i,v in enumerate(values)]
 with (OUT/"morph-boundary.csv").open("w",newline="") as f:
  w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
 summary={"tested_region":{"x0":900,"x1":1130,"y0":430,"y1":740,"purpose":"outside the first orb, where the second lobe first appears"},"stable_baseline_frames":[1,20],"threshold_rgb_delta":threshold,"first_sustained_second_lobe_frame":start+1,"first_sustained_second_lobe_time_s":start/FPS,"first_orb_only_window":{"start_s":0.0,"end_s":start/FPS,"last_included_frame":start},"interpretation":"lighting changes inside the first orb are not counted; only a sustained external right-side departure ends the first-orb window"}
 (OUT/"morph-boundary.json").write_text(json.dumps(summary,indent=2)+"\n")
 selected=range(54,76); sheet=Image.new("RGB",(W*4,H*((len(list(selected))+3)//4)),"black")
 for j,i in enumerate(selected):
  raw=subprocess.check_output(["ffmpeg","-v","error","-ss",str(i/FPS),"-i",str(ROOT/"tmp/reference-video/gleb-reference.mp4"),"-frames:v","1","-f","image2pipe","-vcodec","png","-"],stderr=subprocess.DEVNULL)
  im=Image.open(BytesIO(raw)).convert("RGB");d=ImageDraw.Draw(im);d.ellipse((720-194,580-194,720+194,580+194),outline=(0,255,80),width=3);d.text((8,8),f"f{i+1} {i/FPS:.3f}s delta={values[i]:.2f}",fill=(0,255,80));sheet.paste(im,((j%4)*W,(j//4)*H))
 sheet.save(OUT/"morph-boundary-contact-sheet.png");print(json.dumps(summary,indent=2))
if __name__=="__main__":main()
