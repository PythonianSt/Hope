'use client';
import { useEffect, useMemo, useState } from 'react';
import Bucket from './components/Bucket';
import { BUCKETS } from '../lib/colors';

function getCreds() {
  if (typeof window === 'undefined') return { u:'', k:'' };
  const p = new URLSearchParams(location.search);
  const u = p.get('u') || localStorage.getItem('hope_u') || '';
  const k = p.get('k') || localStorage.getItem('hope_k') || '';
  if (u && k) { localStorage.setItem('hope_u', u); localStorage.setItem('hope_k', k); }
  return { u, k };
}

export default function Home() {
  const [u,setU] = useState(''); const [k,setK] = useState('');
  const [nickname,setNickname] = useState(''); const [newName,setNewName] = useState('');
  const [qr,setQr] = useState(''); const [images,setImages] = useState([]); const [imageIndex,setImageIndex] = useState(0);
  const [fullness,setFullness] = useState({yellow:0,green:0,red:0,black:0,blue:0});
  const [text,setText] = useState(''); const [busy,setBusy] = useState(false); const [notice,setNotice] = useState('');
  const [selected,setSelected] = useState(null); const [bucketItem,setBucketItem] = useState(null);

  const entries = Object.values(BUCKETS);
  useEffect(() => { const c=getCreds(); setU(c.u); setK(c.k); }, []);
  useEffect(() => { if (u && k) loadAll(); }, [u,k]);
  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(()=>setImageIndex(i=>(i+1)%images.length), 5500);
    return ()=>clearInterval(t);
  }, [images]);

  async function loadAll(){
    const [p,b]=await Promise.all([
      fetch(`/api/profile?u=${encodeURIComponent(u)}&k=${encodeURIComponent(k)}`).then(r=>r.json()),
      fetch(`/api/bucket?u=${encodeURIComponent(u)}&k=${encodeURIComponent(k)}`).then(r=>r.json())
    ]);
    if (p.error) { setNotice('ไม่สามารถเปิดข้อมูลด้วยรหัสนี้ได้'); return; }
    setNickname(p.nickname||''); setImages(p.images||[]); setImageIndex((p.images||[]).length ? Math.floor(Math.random()*(p.images||[]).length) : 0); setFullness(b.fullness||fullness);
  }

  async function register(){
    setBusy(true); setNotice('');
    try {
      const r=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:newName,origin:location.origin})});
      const j=await r.json(); if(!r.ok) throw new Error(j.error);
      localStorage.setItem('hope_u',j.userCode); localStorage.setItem('hope_k',j.secret);
      setU(j.userCode); setK(j.secret); setNickname(newName); setQr(j.qrDataUrl);
      history.replaceState(null,'',`/?u=${encodeURIComponent(j.userCode)}&k=${encodeURIComponent(j.secret)}`);
    } catch(e){setNotice(e.message)} finally{setBusy(false)}
  }

  async function uploadImages(e){
    const files=[...e.target.files].slice(0,5); if(!files.length)return;
    const fd=new FormData(); fd.append('u',u); fd.append('k',k); files.forEach(f=>fd.append('images',f));
    setBusy(true); const r=await fetch('/api/profile',{method:'POST',body:fd}); const j=await r.json(); setBusy(false);
    if(!r.ok) return setNotice(j.error); await loadAll(); setNotice('บันทึกรูปภาพแล้ว');
  }

  async function saveMemory(){
    setBusy(true); setNotice('กำลังวิเคราะห์และบันทึกความทรงจำ…');
    try{
      const r=await fetch('/api/memory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({u,k,text})});
      const j=await r.json(); if(!r.ok)throw new Error(j.error); setText(''); setNotice('บันทึกแล้ว'); await loadAll();
    }catch(e){setNotice(e.message)}finally{setBusy(false)}
  }

  async function openBucket(key){
    setSelected(key); setBucketItem(null);
    const j=await fetch(`/api/bucket?u=${encodeURIComponent(u)}&k=${encodeURIComponent(k)}&bucket=${key}`).then(r=>r.json());
    setBucketItem(j.item||null); if(j.fullness)setFullness(j.fullness);
  }

  async function feedback(choice){
    if(!bucketItem)return;
    await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({u,k,memoryId:bucketItem.memory_id,bucket:selected,choice})});
    setNotice('บันทึกคำตอบแล้ว'); setSelected(null); setBucketItem(null);
  }

  const wordCount=useMemo(()=>{
    const latin=(text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)||[]).length;
    const thai=(text.match(/[\u0E00-\u0E7F]+/g)||[]).length;
    return latin+thai;
  },[text]);

  return <main>
    <section className="hero card">
      <h1>Buckets of Hope for Your Loved</h1>
      <p className="subtitle">เก็บความทรงจำที่มีความหมาย และเลือกสิ่งหนึ่งจากความรักนั้นไปกับคุณในวันนี้</p>

      <div className="orbit">
        <div className="photoCircle">
          {images.length ? <img src={images[imageIndex % images.length]} alt="คนที่คุณรัก" /> : <div className="photoPlaceholder">♡<span>เพิ่มภาพคนที่คุณรัก<br/>ได้ไม่เกิน 5 ภาพ</span></div>}
        </div>
        {entries.map((b,i)=>{
          const positions=[{top:'-1%',left:'50%'},{top:'25%',right:'-2%'},{bottom:'-3%',right:'13%'},{bottom:'-3%',left:'13%'},{top:'25%',left:'-2%'}];
          return <Bucket key={b.key} color={b.color} percent={fullness[b.key]||0} label={b.thai} onClick={()=>u&&openBucket(b.key)} style={positions[i]}/>;
        })}
      </div>

      {u && <label className="uploadLabel">อัปโหลด/เปลี่ยนภาพ (สูงสุด 5 ภาพ)<input type="file" accept="image/*" multiple onChange={uploadImages}/></label>}
    </section>

    {!u ? <section className="card identity">
      <h2>เริ่มต้นพื้นที่ความทรงจำของคุณ</h2>
      <label>ชื่อ / ชื่อเล่นของคุณ<input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="เช่น กานต์" maxLength={80}/></label>
      <button className="primary" onClick={register} disabled={busy||!newName.trim()}>สร้างรหัสประจำตัวและ QR code</button>
      {qr && <img className="qr" src={qr} alt="QR code ประจำตัว"/>}
    </section> : <>
      <section className="card identity compact">
        <div><span className="muted">ผู้ใช้งาน</span><strong>{nickname}</strong></div>
        <div><span className="muted">รหัสประจำตัว</span><strong>{u}</strong></div>
        {qr && <img className="qr small" src={qr} alt="QR code ประจำตัว"/>}
      </section>

      <section className="card memoryForm">
        <h2>บันทึกความทรงจำ</h2>
        <p>เขียนภาษาไทยหรืออังกฤษได้ ไม่เกิน 400 คำต่อครั้ง ระบบจะวิเคราะห์และเติมเนื้อหาเข้าสู่ถังทั้ง 5 สีตามบริบท</p>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="เรื่องหนึ่งที่คุณอยากเก็บไว้…" rows={9}/>
        <div className={`counter ${wordCount>400?'over':''}`}>{wordCount} / 400 คำ</div>
        <button className="primary" disabled={busy||!text.trim()||wordCount>400} onClick={saveMemory}>Save memory</button>
      </section>
    </>}

    {notice && <div className="notice">{notice}</div>}

    {selected && <div className="modalBackdrop" onClick={()=>setSelected(null)}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <button className="close" onClick={()=>setSelected(null)}>×</button>
        <div className="modalBucket" style={{background:BUCKETS[selected].color}}></div>
        <h2>{BUCKETS[selected].thai}</h2>
        {bucketItem ? <>
          <p className="memoryText">{bucketItem.text}</p>
          {bucketItem.source_quote && <div className="sourceQuote"><span>คำพูดที่คุณเคยบันทึกไว้</span>“{bucketItem.source_quote}”</div>}
          <div className="adapted"><span>ข้อความที่ AI เรียบเรียงจากความทรงจำนี้</span>{bucketItem.adapted_message}</div>
          <h3>วันนี้ คุณอยากพกอะไรจากถังนี้ไปกับคุณ?</h3>
          <div className="choices">
            <button onClick={()=>feedback('yes')}>✓ ได้เลย</button>
            <button onClick={()=>feedback('unsure')}>○ ไม่แน่ใจ</button>
            <button onClick={()=>feedback('no')}>× ไม่เอา</button>
          </div>
        </> : <p className="empty">ถังใบนี้ยังไม่มีความทรงจำ ลองบันทึกเรื่องราวเพิ่มก่อนนะครับ</p>}
      </div>
    </div>}

    <footer>ข้อมูลส่วนตัวและรูปภาพมีความละเอียดอ่อน ควรใช้ GitHub repository แบบ Private และเก็บ Secret ทั้งหมดไว้ใน Vercel Environment Variables</footer>
  </main>
}
