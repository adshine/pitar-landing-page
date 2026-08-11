#!/usr/bin/env python3
"""Frame-by-frame, full-resolution tracking of only the first Gleb orb."""
from __future__ import annotations
import csv, json, subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
VIDEO=ROOT/"tmp/reference-video/gleb-reference.mp4"
OUT=ROOT/"output/gleb-first-orb-full-video"
W,H,FPS,N=1440,1080,30,900
CX,CY,R=720,580,194

def linear(a):
 a=a.astype(np.float32)/255.; return np.where(a<=.04045,a/12.92,((a+.055)/1.055)**2.4)
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 yy,xx=np.mgrid[:H,:W]; orb=((xx-CX)**2+(yy-CY)**2<=R*R); radius=np.sqrt((xx-CX)**2+(yy-CY)**2); edge_mask=orb&(radius>=150)
 # Fixed source coordinates; no crop is used for frame decoding.
 proc=subprocess.Popen(["ffmpeg","-v","error","-i",str(VIDEO),"-f","rawvideo","-pix_fmt","rgb24","-"],stdout=subprocess.PIPE)
 records=[]; baseline=[]; samples={}
 for i in range(N):
  raw=proc.stdout.read(W*H*3)
  if len(raw)!=W*H*3: raise RuntimeError(f"short frame at {i}: {len(raw)}")
  frame=np.frombuffer(raw,dtype=np.uint8).reshape(H,W,3)
  if i<20: baseline.append(frame.copy())
  if i in {0,15,30,45,57,59,60,75,90,120,180,300,600,899}: samples[i]=frame.copy()
  lin=linear(frame); lum=np.einsum('hwc,c->hw',lin,[.2126,.7152,.0722]); pix=lin[orb]
  grad_y,grad_x=np.gradient(lum); grad=np.hypot(grad_x,grad_y)
  p=np.percentile(pix[:,0]*.2126+pix[:,1]*.7152+pix[:,2]*.0722,[1,50,90,95,99,99.9])
  top=lum.copy(); top[~orb]=0; ids=np.argpartition(top.ravel(),-1000)[-1000:]; weights=top.ravel()[ids]; weights=np.maximum(weights,1e-8); cy,cx=np.unravel_index(ids,(H,W)); bright_cx=float(np.average(cx,weights=weights)); bright_cy=float(np.average(cy,weights=weights))
  rec={"frame":i+1,"time_s":i/FPS,"width":W,"height":H,"orb_mean_luminance":float((pix@np.array([.2126,.7152,.0722])).mean()),"orb_p01_luminance":float(p[0]),"orb_median_luminance":float(p[1]),"orb_p90_luminance":float(p[2]),"orb_p95_luminance":float(p[3]),"orb_p99_luminance":float(p[4]),"orb_p999_luminance":float(p[5]),"orb_mean_rgb_linear":pix.mean(0).tolist(),"orb_mean_gradient":float(grad[orb].mean()),"orb_p99_gradient":float(np.percentile(grad[orb],99)),"bright_centroid_x":bright_cx,"bright_centroid_y":bright_cy}
  records.append(rec)
 proc.stdout.close(); proc.wait()
 base=np.median(np.stack(baseline).astype(np.float32),axis=0)
 for rec in records: rec["baseline_note"]="first 20 full-resolution frames are the fixed-orb reference"
 proc2=subprocess.Popen(["ffmpeg","-v","error","-i",str(VIDEO),"-f","rawvideo","-pix_fmt","rgb24","-"],stdout=subprocess.PIPE)
 edge_scores=[]; orb_scores=[]
 for i in range(N):
  raw=proc2.stdout.read(W*H*3)
  if len(raw)!=W*H*3: raise RuntimeError(f"short second-pass frame at {i}")
  frame=np.frombuffer(raw,dtype=np.uint8).reshape(H,W,3).astype(np.float32); diff=np.abs(frame-base).mean(2)
  orb_score=float(diff[orb].mean()); edge_score=float(diff[edge_mask].mean()); orb_scores.append(orb_score); edge_scores.append(edge_score)
  records[i]["baseline_rgb_delta_orb"]=orb_score; records[i]["baseline_rgb_delta_edge_annulus"]=edge_score
 proc2.stdout.close(); proc2.wait()
 scores=np.array(edge_scores,np.float32); stable=scores[:60]; med=float(np.median(stable)); mad=float(np.median(np.abs(stable-med))); threshold=float(med+8*max(mad,.01))
 morph_candidates=np.where(scores>threshold)[0]; morph_start=int(morph_candidates[0]) if len(morph_candidates) else 60
 for i in range(max(0,morph_start-2),N-2):
  if np.all(scores[i:i+3]>threshold): morph_start=i; break
 for r in records:r["edge_morph_threshold_rgb_delta"]=threshold; r["first_orb_active"]=(r["frame"]-1)<morph_start
 samples={str(k):float(orb_scores[k]) for k in samples}
 with (OUT/"orb-timeline.csv").open("w",newline="") as f:
  w=csv.DictWriter(f,fieldnames=records[0].keys());w.writeheader();w.writerows(records)
 summary={"video_dimensions":[W,H],"fps":FPS,"frames_analyzed":N,"spatial_policy":"all 900 frames decoded at original resolution; orb metrics use absolute coordinates; no resize, blur, or pixel subsampling","first_orb_reference_frames":[1,20],"morph_detection":{"threshold_edge_rgb_delta":threshold,"first_candidate_frame":morph_start+1,"first_candidate_time_s":morph_start/FPS,"rule":"three consecutive edge-annulus RGB departures from the first 20-frame baseline; interior lighting changes are not morph evidence"},"sampled_frame_orb_baseline_scores":samples,"source_video":"gleb-reference.mp4"}
 (OUT/"summary.json").write_text(json.dumps(summary,indent=2)+"\n")
 # Contact sheet uses original pixels only for inspection; no analysis depends on it.
 wanted=sorted(int(k) for k in samples); sheet=Image.new("RGB",(W*3,H*((len(wanted)+2)//3)),"black")
 for j,i in enumerate(wanted):
  frame=samples.get(i); # samples now contains score, so decode selected frames separately below
  # Reopen selected frame losslessly from ffmpeg by time for annotation only.
  raw=subprocess.check_output(["ffmpeg","-v","error","-ss",str(i/FPS),"-i",str(VIDEO),"-frames:v","1","-f","image2pipe","-vcodec","png","-"],stderr=subprocess.DEVNULL)
  from io import BytesIO
  img=Image.open(BytesIO(raw)).convert("RGB"); d=ImageDraw.Draw(img); d.ellipse((CX-R,CY-R,CX+R,CY+R),outline=(0,255,80),width=3); d.text((12,12),f"frame {i+1} / {i/FPS:.2f}s",fill=(0,255,80)); sheet.paste(img,((j%3)*W,(j//3)*H))
 sheet.save(OUT/"full-video-first-orb-contact-sheet.png")
 print(json.dumps(summary,indent=2))
if __name__=="__main__":main()
