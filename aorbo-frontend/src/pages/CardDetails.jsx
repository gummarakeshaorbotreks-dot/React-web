import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

export default function CardDetails() {
  const { id } = useParams();
  const [trek, setTrek] = useState(null);
  const [relatedTreks, setRelatedTreks] = useState([]);
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = 'http://127.0.0.1:8000';

  useEffect(function() {
    async function getDetails() {
      try {
        setLoading(true);
        const res = await fetch(BACKEND_URL + '/api/treks/' + id + '/');
        if (!res.ok) throw Error('Trek not found');
        const data = await res.json();
        setTrek(data);
        setRelatedTreks(data.related_treks || []);
      } catch (err) {
        console.error('Failed fetching trek details:', err);
      } finally {
        setLoading(false);
      }
    }
    getDetails();
  }, [id]);

  if (loading) {
    return <div style={{padding:'clamp(2rem, 10vw, 5rem)',textAlign:'center',color:'#4b5563',fontSize:'1rem'}}>Loading trek details...</div>;
  }

  if (!trek) {
return <div style={{padding:'clamp(2rem, 10vw, 5rem)',textAlign:'center',color:'#4b5563'}}>Trek not found. Please go back and try again.</div>;
  }

  let imgSrc = trek.main_image;
  if (imgSrc && !imgSrc.startsWith('http')) {
    imgSrc = BACKEND_URL + imgSrc;
  }
  if (!imgSrc) {
    imgSrc = '/images/placeholder.jpg';
  }

  const Y = '#FFE100';

  return (
    <div style={{fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',maxWidth:'1200px',margin:'0 auto',padding:'1.5rem 1rem 4rem',background:'#FFFDF0',minHeight:'100vh'}}>
      <style>{`
        .cd-hero-img { width: 100%; height: clamp(200px, 50vw, 380px); object-fit: cover; opacity: 0.6; display: block; }
        .cd-grid { display: grid; grid-template-columns: 1fr; gap: 1.25rem; align-items: start; }
        @media (min-width: 768px) { .cd-grid { grid-template-columns: minmax(0,2fr) minmax(0,1fr); } }
      `}</style>
      <div style={{position:'relative',borderRadius:'20px',overflow:'hidden',marginBottom:'1.5rem',minHeight:'clamp(200px, 50vw, 320px)',background:'#1a2e1a'}}>
        <img src={imgSrc} alt={trek.name} className="cd-hero-img" />
        <div style={{position:'absolute',inset:0,background:'linear-gradient(to top, rgba(10,20,10,0.92) 0%, rgba(10,20,10,0.3) 60%, transparent 100%)'}} />
        <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'clamp(1rem, 3vw, 2rem)'}}>
          <div style={{display:'flex',gap:'8px',marginBottom:'0.75rem',flexWrap:'wrap'}}>
            {trek.state && <span style={{background:'rgba(255,255,255,0.15)',color:'#fff',fontSize:'clamp(10px, 1.5vw, 11px)',padding:'3px 12px',borderRadius:'999px',backdropFilter:'blur(4px)'}}>📍 {trek.state}</span>}
          </div>
          <h1 style={{color:'#fff',fontSize:'clamp(1.6rem, 4vw, 2.2rem)',fontWeight:700,margin:'0 0 0.75rem',lineHeight:1.2}}>{trek.name}</h1>
          <div style={{display:'flex',gap:'1rem',flexWrap:'wrap',alignItems:'center'}}>
            {trek.duration_days && <span style={{color:'rgba(255,255,255,0.8)',fontSize:'clamp(11px, 1.5vw, 13px)'}}>🕒 {trek.duration_days}</span>}
            {trek.operating_days && <span style={{color:'rgba(255,255,255,0.8)',fontSize:'clamp(11px, 1.5vw, 13px)'}}>📅 {trek.operating_days}</span>}
            {trek.price_start && <span style={{background:Y,color:'#1a1a1a',fontSize:'clamp(11px, 1.5vw, 13px)',fontWeight:700,padding:'5px 14px',borderRadius:'999px'}}>₹{trek.price_start} onwards</span>}
          </div>
        </div>
      </div>

      <div className="cd-grid">
        {/* LEFT COLUMN */}
        <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
          <div style={{background:'#FFF8C0',border:'1px solid #F5D800',borderRadius:'16px',padding:'1.5rem'}}>
            <h2 style={{fontSize:'1.1rem',fontWeight:700,margin:'0 0 0.75rem',color:'#111827'}}>📖 About this Trek</h2>
            <p style={{color:'#374151',lineHeight:'1.8',fontSize:'0.98rem',margin:0}}>
              {trek.description || trek.summary || ('Explore ' + trek.name + ', a wonderful destination waiting for you.')}
            </p>
          </div>

          {trek.activities && trek.activities.length > 0 && (
            <div style={{background:'#FFF8C0',border:'1px solid #F5D800',borderRadius:'16px',padding:'1.5rem'}}>
              <h2 style={{fontSize:'1.1rem',fontWeight:700,margin:'0 0 1rem',color:'#111827'}}>⚡ Activities</h2>
              <div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
                {trek.activities.map(function(act, i) {
                  return <span key={i} style={{background:'#FFE100',color:'#1a1a1a',fontSize:'13px',fontWeight:600,padding:'6px 14px',borderRadius:'999px',border:'1px solid #F5D800'}}>{act}</span>;
                })}
              </div>
            </div>
          )}

          <div style={{background:'#FFF8C0',border:'1px solid #F5D800',borderRadius:'16px',padding:'1.5rem'}}>
            <h2 style={{fontSize:'1.1rem',fontWeight:700,margin:'0 0 1rem',color:'#111827'}}>📍 Famous Places</h2>
            {trek.famous_places && trek.famous_places.length > 0 ? (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))',gap:'8px'}}>
                {trek.famous_places.map(function(place, i) {
                  return (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',color:'#374151',background:'#fff',padding:'8px 12px',borderRadius:'10px',border:'1px solid #F5D800'}}>
                      <span style={{color:'#ff6a1a',fontSize:'10px'}}>●</span> {place}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{color:'#9ca3af',fontSize:'13px',margin:0}}>Coming soon...</p>
            )}
          </div>

          {relatedTreks.length > 0 && (
            <div style={{background:'#FFF8C0',border:'1px solid #F5D800',borderRadius:'16px',padding:'1.5rem'}}>
              <h2 style={{fontSize:'1.1rem',fontWeight:700,margin:'0 0 1rem',color:'#111827'}}>🗺️ Related Treks</h2>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:'10px'}}>
                {relatedTreks.map(function(r) {
                  return (
                    <Link key={r.id} to={'/treks/' + r.id} style={{textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',border:'1px solid #F5D800',borderRadius:'12px',color:'#111827',fontSize:'13px',fontWeight:500,background:'#fff',transition:'all 0.2s'}}>
                      <span>{r.name}</span>
                      <span style={{color:'#9ca3af',fontSize:'12px'}}>{r.state} →</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
          <div style={{background:'#1a2e1a',borderRadius:'16px',padding:'1.5rem',color:'#fff'}}>
            <p style={{fontSize:'12px',color:'rgba(255,255,255,0.6)',margin:'0 0 0.25rem'}}>Starting from</p>
            <p style={{fontSize:'clamp(1.5rem, 5vw, 2rem)',fontWeight:700,color:'#FFE100',margin:'0 0 0.25rem',lineHeight:1}}>₹{trek.price_start}</p>
            <p style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',margin:'0 0 1.25rem'}}>per person onwards*</p>
          </div>

          <div style={{background:'#FFF8C0',border:'1px solid #F5D800',borderRadius:'16px',padding:'1.25rem'}}>
            <h3 style={{fontSize:'14px',fontWeight:700,margin:'0 0 1rem',color:'#111827'}}>Trip Info</h3>
            <div style={{display:'flex',flexDirection:'column',gap:'10px',fontSize:'13px'}}>
              {trek.duration_days && <span>🕒 Duration: <strong>{trek.duration_days}</strong></span>}
              {trek.operating_days && <span>📅 Departure: <strong>{trek.operating_days}</strong></span>}
              {trek.state && <span>📍 Location: <strong>{trek.state}</strong></span>}
            </div>
          </div>

          <div style={{background:'#FFF8C0',border:'1px solid #F5D800',borderRadius:'16px',padding:'1.25rem'}}>
            <h3 style={{fontSize:'14px',fontWeight:700,margin:'0 0 1rem',color:'#111827'}}>✅ Trusted Operators</h3>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {trek.operators && trek.operators.length > 0 ? trek.operators.map(function(op, i) {
                const initials = op.split(' ').map(function(w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',padding:'8px 10px',background:'#FFE100',borderRadius:'10px',border:'1px solid #F5D800'}}>
                    <div style={{width:'30px',height:'30px',borderRadius:'50%',background:'#1a2e1a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',color:'#FFE100',fontWeight:700,flexShrink:0}}>{initials}</div>
                    <span style={{color:'#1a1a1a',fontWeight:600}}>{op}</span>
                  </div>
                );
              }) : (
                <p style={{color:'#9ca3af',fontSize:'13px',margin:0}}>Coming soon...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
