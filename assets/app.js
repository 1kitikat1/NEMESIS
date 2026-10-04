const reveal = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("visible"); reveal.unobserve(e.target); }});
},{threshold:.12});
document.querySelectorAll(".feature,.large-game,.download-card,.section-title").forEach(e=>{
  e.classList.add("reveal"); reveal.observe(e);
});
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener("click",e=>{
  const el=document.querySelector(a.getAttribute("href")); if(el){e.preventDefault();el.scrollIntoView({behavior:"smooth"});}
}));

document.querySelectorAll("[data-unavailable]").forEach(button=>{
  button.addEventListener("click", event=>{
    event.preventDefault();
    const old = button.innerHTML;
    button.innerHTML = "<span>Пока недоступно</span><b>×</b>";
    button.classList.add("disabled-message");
    setTimeout(()=>{
      button.innerHTML = old;
      button.classList.remove("disabled-message");
    }, 1800);
  });
});
