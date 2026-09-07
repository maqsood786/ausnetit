const selected = new Set();
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const recipientEmail = "maqsoodanwar919@gmail.com";
const web3FormsAccessKey = "YOUR_WEB3FORMS_ACCESS_KEY";
const web3FormsUrl = "https://api.web3forms.com/submit";

function initialiseAnimations() {
  if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) return;
  gsap.registerPlugin(ScrollTrigger);
  const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
  intro.from(".hero-item", { y: 28, opacity: 0, duration: .8, stagger: .11 })
    .from(".orb-ring", { scale: .78, opacity: 0, duration: 1.05, stagger: .12, ease: "back.out(1.2)" }, "-=.7")
    .from(".orb-core", { scale: .65, opacity: 0, duration: .7, ease: "back.out(1.5)" }, "-=.65")
    .from(".float-card", { y: 22, opacity: 0, duration: .55, stagger: .16 }, "-=.4");
  gsap.to(".ring-1", { rotation: 360, duration: 30, repeat: -1, ease: "none" });
  gsap.to(".ring-2", { rotation: -360, duration: 42, repeat: -1, ease: "none" });
  gsap.to(".float-card", { y: -10, duration: 2.4, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: .35 });
  [
    { target: ".service-card", trigger: ".service-grid", from: { y: 34 }, stagger: .09 },
    { target: ".step", trigger: ".step-list", from: { x: -24 }, stagger: .1 },
    { target: ".intake-panel", trigger: ".intake-panel", from: { y: 30 }, stagger: 0 },
    { target: ".talent-panel", trigger: ".talent-panel", from: { y: 30 }, stagger: 0 },
    { target: ".framework-grid div", trigger: ".framework-grid", from: { y: 24 }, stagger: .08 }
  ].forEach(({ target, trigger, from, stagger }) => {
    gsap.from(target, { ...from, opacity: 0, duration: .68, stagger, ease: "power3.out", scrollTrigger: { trigger, start: "top 82%", once: true } });
  });
  ScrollTrigger.refresh();
}

window.addEventListener("load", initialiseAnimations, { once: true });

const brief = document.getElementById("brief");
const count = document.getElementById("briefCount");
brief.addEventListener("input", () => { count.textContent = `${brief.value.length} / 1200`; });

document.querySelectorAll(".choice").forEach((button) => {
  button.addEventListener("click", () => {
    const value = button.dataset.choice;
    const isSelected = selected.has(value);
    button.classList.toggle("selected", !isSelected);
    button.querySelector("span").textContent = isSelected ? "+" : "\u2713";
    isSelected ? selected.delete(value) : selected.add(value);
  });
});

function showToast(title, message) {
  const toast = document.getElementById("successToast");
  toast.innerHTML = `<b>${title}</b><br>${message}`;
  toast.style.display = "block";
  if (window.gsap && !prefersReducedMotion) gsap.fromTo(toast, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .35 });
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    if (window.gsap && !prefersReducedMotion) gsap.to(toast, { y: 20, opacity: 0, duration: .3, onComplete: () => { toast.style.display = "none"; } });
    else toast.style.display = "none";
  }, 3200);
}

async function sendEmailForm(subject, lines, extras = {}) {
  const body = lines.filter(Boolean).join("\n");
  const payload = {
    access_key: web3FormsAccessKey,
    subject,
    from_name: "AusnetIT Website",
    email: recipientEmail,
    message: body,
    ...extras
  };

  try {
    const response = await fetch(web3FormsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (response.ok && result.success) return true;

    console.warn("Web3Forms email failed:", result || "unknown error");
  } catch (error) {
    console.warn("Web3Forms unavailable, falling back to mailto:", error);
  }

  const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  try {
    window.location.href = mailtoUrl;
  } catch (error) {
    window.open(mailtoUrl, "_self");
  }

  return false;
}

document.getElementById("scopeBtn").addEventListener("click", async () => {
  const details = brief.value.trim();
  const pmba = document.getElementById("pmba").checked;
  const ticket = document.getElementById("ticket");
  const services = [...selected];
  const gaps = [];
  if (!services.length) gaps.push("Choose at least one service area.");
  if (!details) gaps.push("Add the business outcome or problem you want to solve.");
  if (details && details.length < 90) gaps.push("What is the target timeline and expected scale?");
  if (pmba) gaps.push("Who is the primary stakeholder for PM / BA coordination?");

  const serviceSummary = services.length ? services.join(" + ") : "General technology enquiry";
  const projectLines = [
    "A new project brief has been prepared.",
    "",
    `Service areas: ${serviceSummary}`,
    `Delivery preference: ${pmba ? "PM / BA-led delivery" : "Technical delivery"}`,
    "",
    "Requirement:",
    details || "No detailed requirement provided.",
    "",
    "Clarification items:",
    gaps.length ? gaps.map((gap) => `- ${gap}`).join("\n") : "No major gaps detected."
  ];

  document.getElementById("ticketContent").innerHTML = `<strong>${serviceSummary}</strong><br>${details || "Client has not provided a detailed requirement yet."}<br><br><span class="ticket-accent">Delivery:</span> ${pmba ? "PM / BA-led delivery" : "Technical delivery"}`;
  document.getElementById("questionsText").innerHTML = gaps.length ? gaps.map((gap) => `&bull; ${gap}`).join("<br>") : "No major gaps detected in this first pass. A specialist will validate the brief.";
  document.getElementById("ticketStatus").textContent = gaps.length ? "NEEDS INFO" : "READY FOR REVIEW";
  ticket.style.display = "block";
  if (window.gsap && !prefersReducedMotion) gsap.fromTo(ticket, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .5, ease: "power3.out" });
  showToast(gaps.length ? "Brief structured." : "Brief ready.", gaps.length ? "A few useful details will strengthen your request." : "Your ticket is prepared for human review.");

  await sendEmailForm("New AusnetIT project brief", projectLines, {
    service_areas: serviceSummary,
    delivery_preference: pmba ? "PM / BA-led delivery" : "Technical delivery",
    requirement: details || "No detailed requirement provided.",
    clarification_items: gaps.length ? gaps.join(" | ") : "No major gaps detected."
  });
});

document.querySelectorAll(".service-card a").forEach((link) => link.addEventListener("click", () => {
  const value = link.closest(".service-card").dataset.service;
  const button = [...document.querySelectorAll(".choice")].find((choice) => choice.dataset.choice === value);
  if (button && !selected.has(value)) button.click();
}));

document.getElementById("talentBtn").addEventListener("click", async () => {
  const role = document.getElementById("role").value;
  const headcount = document.getElementById("headcount").value;
  const engagement = document.getElementById("engagement").value;
  const region = document.getElementById("region").value;
  const outsourced = document.getElementById("outsourcing").checked ? "Yes" : "No";
  const talentLines = [
    "A new engineering talent request has been prepared.",
    "",
    `Engagement: ${engagement}`,
    `Primary region: ${region}`,
    `Role: ${role}`,
    `Team size: ${headcount}`,
    `Open to outsourced delivery: ${outsourced}`
  ];

  document.getElementById("talentMessage").textContent = `Request prepared for ${headcount}: ${role}. Our team will confirm availability and next steps.`;
  showToast("Talent request prepared.", "We have captured your preferred role and engagement.");

  await sendEmailForm("New AusnetIT talent request", talentLines, {
    engagement,
    primary_region: region,
    role,
    team_size: headcount,
    outsourced_delivery: outsourced
  });
});
