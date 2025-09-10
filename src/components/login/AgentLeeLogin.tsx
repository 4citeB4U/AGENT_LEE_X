"use client";

import React, { useEffect, useRef, useState } from "react";
import { warmKokoro } from "@/lib/kokoro-tts";

// Props allow injecting Base64 images for avatar & footer logo, or URLs.
export type AgentLeeLoginProps = {
  agentLeeSrc?: string; // data:image/jpeg;base64,... OR /image/... url
  logoSrc?: string;     // data:image/jpeg;base64,... OR /image/... url
  onContinueRoute?: string; // where to navigate after loading; default: "/"
};

const TERMS_TEXT = String.raw`Terms of Service
Last Updated: August 15, 2023

These Terms of Service ("Terms") govern your access to and use of the Artist Empowerment Platform. Please read them carefully.

Table of Contents
1. Acceptance of Terms
2. Account Registration and Security
3. Content and Intellectual Property
4. Platform Fees and Revenue Sharing
5. Prohibited Conduct
6. Termination
7. Disclaimer of Warranties
8. Limitation of Liability
9. Changes to Terms
10. Governing Law
11. Contact Information

1. Acceptance of Terms
By accessing or using the Artist Empowerment Platform ("Platform") operated by LEEWAY through RapidWebDevelop.com ("we," "us," or "our"), you agree to be bound by these Terms of Service ("Terms") and our Privacy Policy.
If you do not agree to these Terms, you must not access or use the Platform. If you are accessing the Platform on behalf of a company or other legal entity, you represent that you have the authority to bind such entity to these Terms.
The Platform is intended for use by individuals who are at least 16 years of age. By using the Platform, you confirm that you meet this requirement.

2. Account Registration and Security
2.1 Account Creation
To use certain features of the Platform, you must register for an account. During registration, you agree to provide accurate, current, and complete information about yourself as prompted by our registration process. You also agree to update this information to maintain its accuracy.
2.2 Account Security
You are responsible for safeguarding the password and any other credentials used to access your account. You agree not to disclose your password to any third party and to take sole responsibility for any activities or actions under your account, whether or not you have authorized such activities or actions.
2.3 Unauthorized Access
You agree to notify us immediately of any unauthorized access to your account or any other breaches of security. We cannot and will not be liable for any loss or damage arising from your failure to maintain the security of your account credentials.
2.4 One Account Per User
Each user may maintain only one account. If we detect multiple accounts created by the same user, we reserve the right to merge or terminate the additional accounts.

3. Content and Intellectual Property
3.1 Content Ownership
By using the Platform, you retain all rights to your content. We do not claim ownership of any content that you create, upload, or display on or through the Platform.
3.2 Content License
You grant us a non-exclusive, royalty-free, transferable, sublicensable, worldwide license to use, store, display, reproduce, and modify your content solely for the purpose of operating and improving the Platform. This license ends when you delete your content or your account (except to the extent content has been shared with others, and they have not deleted it).
3.3 Content Representations
You represent and warrant that:
• You either own or have the necessary rights to all content you submit to the Platform
• Your content does not violate any intellectual property rights, privacy rights, or other rights of any person or entity
• Your content complies with these Terms and all applicable laws and regulations
3.4 Platform Intellectual Property
All intellectual property rights in and to the Platform (excluding content provided by users) are owned by us or our licensors. These Terms do not grant you any right to use our trademarks, logos, domain names, or other distinctive brand features.
3.5 Feedback
If you provide us with any feedback or suggestions regarding the Platform ("Feedback"), you assign to us all rights in such Feedback and agree that we have the right to use and fully exploit such Feedback in any manner we deem appropriate.

4. Platform Fees and Revenue Sharing
4.1 Fee Structure
In exchange for using the Platform, we retain 15% of all revenue generated through your Platform. You receive the remaining 85% of revenue. This fee covers our operating costs, including hosting, development, security, and maintenance.
4.2 Payment Processing
Payment processing fees charged by third-party payment processors are included in our 15% fee. We do not impose additional fees or charges for standard payment processing.
4.3 Payout Schedule
We issue payments on a weekly basis, provided your account is in good standing and compliant with these Terms. The minimum payout threshold is $20 USD (or equivalent in your local currency). Amounts below this threshold will be carried over to the next payout period.
4.4 Taxes
You are responsible for all taxes associated with your use of the Platform and any revenue you generate, including sales tax, VAT, income tax, or any other applicable taxes. We may collect and remit certain taxes where required by law, but this does not relieve you of your tax obligations.
4.5 Refunds and Chargebacks
In the event of customer refunds or chargebacks, the corresponding amount will be deducted from your current or future payouts. We reserve the right to establish a reasonable refund policy to maintain platform integrity and customer satisfaction.

5. Prohibited Conduct
You agree not to engage in any of the following prohibited conduct:
5.1 Legal Compliance
• Violate any applicable law, regulation, or third-party right
• Use the Platform for any illegal purpose or in support of illegal activities
• Engage in any activity that violates sanctions, export controls, or trade restrictions
5.2 Content Restrictions
• Post content that is defamatory, obscene, pornographic, or harmful to minors
• Distribute content that promotes discrimination, bigotry, racism, hatred, harassment, or harm against any individual or group
• Share content that is false, inaccurate, or misleading in a way that could cause harm
• Upload content that infringes upon any patent, trademark, trade secret, copyright, or other intellectual property right
5.3 Platform Security
• Attempt to interfere with, compromise, or disrupt the Platform or servers connected to the Platform
• Use the Platform to distribute malware, viruses, or other harmful computer code
• Engage in any activity that places excessive load on our infrastructure
• Bypass or circumvent measures we may use to prevent or restrict access to the Platform
5.4 Account Conduct
• Impersonate another person or misrepresent your affiliation with any person or entity
• Sell, trade, or transfer your account to another party
• Collect or store personal data about other users without their express permission
• Use the Platform for spamming or unsolicited commercial communications
We reserve the right to remove content, suspend or terminate accounts, and take other appropriate actions against users who violate these prohibitions.

6. Termination
6.1 Termination by You
You may terminate your account at any time by following the instructions on the Platform. Upon termination, your profile will be disabled, but your content may remain on the Platform as detailed in our data retention policies.
6.2 Termination by Us
We reserve the right to suspend or terminate your account at any time for violations of these Terms or for any other reason at our sole discretion. We may, but are not obligated to, provide you with advance notice of such termination.
6.3 Effects of Termination
Upon termination of your account:
• Your right to use the Platform will immediately cease
• We may delete or anonymize your content, except as required by law or for legitimate business purposes
• Any outstanding payments will be processed according to our regular schedule, provided your account was in good standing
• All provisions of these Terms that should survive termination shall remain in effect

7. Disclaimer of Warranties
THE PLATFORM IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR COURSE OF PERFORMANCE.
WE DO NOT WARRANT THAT:
• THE PLATFORM WILL FUNCTION UNINTERRUPTED, SECURE, OR AVAILABLE AT ANY PARTICULAR TIME OR LOCATION
• ANY ERRORS OR DEFECTS WILL BE CORRECTED
• THE PLATFORM IS FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS
• THE RESULTS OF USING THE PLATFORM WILL MEET YOUR REQUIREMENTS
YOUR USE OF THE PLATFORM IS SOLELY AT YOUR OWN RISK.

8. Limitation of Liability
TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL WE, OUR DIRECTORS, EMPLOYEES, AGENTS, PARTNERS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR:
• ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES
• ANY DAMAGE, LOSS, OR INJURY RESULTING FROM YOUR ACCESS TO OR USE OF THE PLATFORM
• ANY CONTENT OBTAINED FROM THE PLATFORM
• UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT
WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY, AND WHETHER OR NOT WE HAVE BEEN INFORMED OF THE POSSIBILITY OF SUCH DAMAGE.
OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING OUT OF OR RELATING TO THESE TERMS OR THE PLATFORM SHALL NOT EXCEED THE GREATER OF $100 OR THE AMOUNT YOU HAVE PAID US IN THE PAST SIX MONTHS.
SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF LIABILITY FOR CERTAIN TYPES OF DAMAGES, SO SOME OF THE ABOVE LIMITATIONS MAY NOT APPLY TO YOU.

9. Changes to Terms
We may modify these Terms at any time by posting the revised Terms on the Platform. Your continued use of the Platform after such changes constitutes your acceptance of the new Terms. If the changes are significant, we will provide a more prominent notice or send you an email notification.
It is your responsibility to review these Terms periodically. If you do not agree to the modified terms, you should discontinue your use of the Platform.

10. Governing Law
10.1 Applicable Law
These Terms shall be governed by the laws of the State of Wisconsin, without regard to its conflict of law provisions.
10.2 Dispute Resolution
Any disputes arising under these Terms shall be resolved in the state or federal courts located in Milwaukee County, Wisconsin. You consent to the personal jurisdiction of such courts and waive any objection to venue in these courts.
10.3 Waiver of Class Actions
You agree to resolve any disputes on an individual basis and waive any right to bring, join, or participate in class actions, class arbitrations, or representative actions.
10.4 Limitation Period
Any cause of action or claim you may have arising out of or relating to these Terms or the Platform must be commenced within one (1) year after the cause of action accrues, otherwise, such cause of action or claim is permanently barred.

11. Contact Information
If you have any questions about these Terms, please contact us at:
Email: agentlee@rapidwebdevelop.com
Phone: 414-626-9992 (Sales)
Address:
RapidWebDevelop by LEEWAY
Milwaukee, WI 53206
United States`;

const PRIVACY_TEXT = String.raw`Privacy Policy
Last Updated: August 15, 2023

Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.

Table of Contents
1. Information We Collect
2. How We Use Your Information
3. How We Share Your Information
4. Agent Lee AI Assistant
5. Your Rights and Choices
6. Data Retention
7. Children's Privacy
8. International Data Transfers
9. Changes to This Policy
10. Contact Us

1. Information We Collect
1.1 Information You Provide to Us:
• Account information: Name, email address, phone number, and other details you provide when creating an account
• Profile information: Artist name, biography, photos, and other details you choose to share
• Content: Music, videos, images, text, and other materials you upload to the Platform
• Payment information: Credit card details, banking information, and other financial data necessary for transactions
• Communications: Messages sent to us or through the Platform, including support requests and feedback

1.2 Information Collected Automatically:
• Device information: IP address, browser type, operating system, and device identifiers
• Usage information: Pages visited, actions taken, features used, and interaction patterns
• Location information: General location data derived from your IP address
• Log data: Access times, pages viewed, and system activity
• Cookies and similar technologies: Data collected via cookies, pixels, and similar tracking methods

1.3 Information from Third Parties:
• Social media: Data shared when you connect social media accounts to our Platform
• Payment processors: Transaction information from payment providers
• Analytics providers: Usage and performance data about our Platform
• Marketing partners: Information about promotional campaigns and advertising effectiveness

2. How We Use Your Information
We use the information we collect for the following purposes:
• Providing the Platform: Delivering our services, processing transactions, and maintaining your account
• Personalization: Customizing your experience and offering content, features, and recommendations tailored to your preferences
• Communication: Sending administrative messages, updates, security alerts, and support responses
• Marketing: Promoting our services and providing information about features, updates, and events (subject to your preferences)
• Improvement: Analyzing usage patterns to enhance our Platform, develop new features, and optimize performance
• Security: Protecting against fraud, unauthorized access, and other potential threats
• Legal compliance: Fulfilling legal obligations, enforcing our terms, and resolving disputes
We process your information based on one or more of the following legal grounds: to perform our contractual obligations to you; with your consent; for our legitimate business interests; and to comply with legal requirements.

3. How We Share Your Information
We may share your information in the following circumstances:
• Service Providers: With vendors, consultants, and service providers who need access to such information to perform services on our behalf, such as hosting, payment processing, customer support, and analytics
• Legal Requirements: In response to a legal request if we believe disclosure is required by law, regulation, or legal process
• Protection of Rights: To protect the rights, property, and safety of our users, the public, or ourselves
• Business Transfers: In connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business
• With Your Consent: With third parties when you have given us your consent to do so
Important: We do not sell your personal information to third parties for marketing or advertising purposes.
When we share data with service providers, we require them to protect your information in a manner consistent with this Privacy Policy.

4. Agent Lee AI Assistant
Our Platform includes Agent Lee, an AI assistant that processes your information to provide personalized assistance.
4.1 How Agent Lee Uses Your Information:
• Analyzing your content and interactions to provide contextual help and support
• Remembering your preferences and prior interactions to deliver a more personalized experience
• Assisting with communication between you and your fans based on your guidelines and preferences
• Generating reports and insights based on your platform data to help optimize your artist presence
• Learning from your feedback to improve its recommendations and assistance
4.2 Agent Lee Privacy Controls:
You can control Agent Lee's access to your information through your privacy settings:
• Pause or disable Agent Lee's learning from your interactions
• Delete conversation history and previously learned preferences
• Specify which platform data Agent Lee can access and analyze
• Review and manage automated actions performed by Agent Lee
While Agent Lee helps make the Platform more useful, its use is optional. You can limit or disable Agent Lee's functionality without losing access to core Platform features.

5. Your Rights and Choices
Depending on your location, you may have certain rights regarding your personal information:
5.1 Account Information
You can update, correct, or delete your account information at any time by logging into your account settings. If you need assistance, please contact our support team.
5.2 Marketing Communications
You can opt out of receiving promotional emails by following the instructions in those emails or by updating your communication preferences in your account settings. Even if you opt out, we may still send you non-promotional communications, such as those about your account or our ongoing business relations.
5.3 Cookies and Tracking Technologies
Most web browsers are set to accept cookies by default. You can usually adjust your browser settings to remove or reject cookies. Please note that removing or rejecting cookies could affect the availability and functionality of our Platform.
5.4 Additional Rights
In certain jurisdictions, you may have the right to: access and receive a copy of your personal information; rectify inaccurate or incomplete personal information; request deletion of your personal information; restrict or object to certain processing; request portability of your personal information; withdraw consent where processing is based on consent. To exercise these rights, please contact us using the information in the "Contact Us" section below.

6. Data Retention
We retain your information for as long as your account is active or as needed to provide you with our services. We will also retain and use your information as necessary to comply with our legal obligations, resolve disputes, and enforce our agreements.
When determining retention periods, we consider:
• The amount, nature, and sensitivity of the personal information
• The potential risk of harm from unauthorized use or disclosure
• The purposes for which we process the information and whether we can achieve those purposes through other means
• Applicable legal, regulatory, tax, accounting, or other requirements
After your account is closed:
• We will retain some information for a limited period to address any follow-up questions or concerns
• Backup copies of your data may remain in our archives, but we have policies and procedures to ensure we do not keep personal data longer than necessary
• We will anonymize or delete information when it's no longer needed for the purposes described in this policy

7. Children's Privacy
The Platform is not directed to children under 16 years of age. We do not knowingly collect personal information from children under 16. If we learn that we have collected personal information from a child under 16 without verification of parental consent, we will take steps to delete that information promptly.
If you are a parent or guardian and believe that your child has provided us with personal information without your consent, please contact us, and we will take steps to remove that information from our servers.

8. International Data Transfers
We may transfer, store, and process your information in countries other than your own. Our servers and service providers may be located in the United States or other countries outside of your jurisdiction.
When we transfer your information internationally, we take steps to ensure that your information receives an adequate level of protection in the jurisdictions in which we process it, including through:
• Using approved data transfer mechanisms, such as Standard Contractual Clauses
• Obtaining your consent for certain types of data transfers
• Ensuring our service providers maintain adequate data security measures
• Entering into appropriate contracts that protect your personal information
By using our Platform, you acknowledge that your information may be transferred to our facilities and to those third parties with whom we share it as described in this Privacy Policy.

9. Changes to This Policy
We may update this Privacy Policy from time to time to reflect changes to our information practices. We will notify you of any material changes by:
• Posting a notice on our Platform prior to the change becoming effective
• Sending an email notification to the address associated with your account
• Displaying a prominent notice when you next access the Platform
We encourage you to periodically review this page for the latest information on our privacy practices. Your continued use of the Platform after any changes to this Privacy Policy will constitute your acceptance of such changes.

10. Contact Us
If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
Email: agentlee@rapidwebdevelop.com
Phone: 414-367-6211 (Support)
Address:
RapidWebDevelop by LEEWAY
Milwaukee, WI 53206
United States

Please allow 2-3 business days for a response to privacy inquiries.`;

function useCanvasBackground(canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;

    let raf = 0; let W = 0, H = 0, dpr = 1;
    const resize = () => {
      dpr = Math.max(1, window.devicePixelRatio || 1);
      W = Math.floor(window.innerWidth * dpr);
      H = Math.floor(window.innerHeight * dpr);
      c.width = W; c.height = H;
      c.style.width = window.innerWidth + "px";
      c.style.height = window.innerHeight + "px";
    };
    const onResize = () => resize();
    window.addEventListener("resize", onResize, { passive: true });
    resize();

    const config = { pulseSpeed: 0.7, glowIntensity: 1.5, colorIntensity: 1.5 } as const;
    const colors = { darkBlue: "#001a33", emerald: "#0d4d4d", brightGold: "#ffea80", gold: "#ffd700" } as const;
    const meshSize = 40 * dpr, waveHeight = 30 * dpr;

    type P = { x: number; y: number; size: number; speedX: number; speedY: number; color: string; pulseOffset: number };
    const particles: P[] = [];
    for (let i = 0; i < 200; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        size: (Math.random() * 3 + 1) * dpr,
        speedX: (Math.random() * 2 - 1) * dpr * 0.6,
        speedY: (Math.random() * 2 - 1) * dpr * 0.6,
        color: i % 3 === 0 ? colors.darkBlue : (i % 3 === 1 ? colors.emerald : colors.gold),
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    const mix = (a: string, b: string, r: number) => {
      const r1 = parseInt(a.slice(1, 3), 16), g1 = parseInt(a.slice(3, 5), 16), b1 = parseInt(a.slice(5, 7), 16);
      const r2 = parseInt(b.slice(1, 3), 16), g2 = parseInt(b.slice(3, 5), 16), b2 = parseInt(b.slice(5, 7), 16);
      const R = Math.round(r1 * (1 - r) + r2 * r), G = Math.round(g1 * (1 - r) + g2 * r), B = Math.round(b1 * (1 - r) + b2 * r);
      return "#" + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
    };

    const LS: { active: boolean; phase: "idle" | "vortex" | "trace" | "fade" } = (window as any).__LEE_LOAD_STATE || { active: false, phase: "idle" };

    const animate = (time: number) => {
      const t = time * 0.0005; // slower waves
      ctx.clearRect(0, 0, W, H);

      // Horizontal lines
      ctx.lineWidth = 1.5 * dpr;
      for (let y = 0; y < H; y += meshSize) {
        ctx.beginPath();
        for (let x = 0; x < W; x += 5 * dpr) {
          const wave = Math.sin(x * 0.01 + t) * waveHeight + Math.sin(y * 0.005 + t * 1.5) * waveHeight * 0.5;
          const yy = y + wave; if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        const pulse = Math.sin(t * 2 * config.pulseSpeed + y * 0.01) * 0.5 + 0.5;
        const grad = ctx.createLinearGradient(0, y, W, y);
        grad.addColorStop(0, colors.darkBlue);
        grad.addColorStop(0.3, mix(colors.emerald, colors.gold, pulse));
        grad.addColorStop(0.5, mix(colors.gold, colors.brightGold, pulse * config.colorIntensity));
        grad.addColorStop(0.7, mix(colors.brightGold, colors.emerald, pulse));
        grad.addColorStop(1, colors.darkBlue);
        ctx.strokeStyle = grad; ctx.stroke();

        // Glow
        ctx.beginPath();
        for (let x = 0; x < W; x += 5 * dpr) {
          const wave = Math.sin(x * 0.01 + t) * waveHeight + Math.sin(y * 0.005 + t * 1.5) * waveHeight * 0.5;
          const yy = y + wave; if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.lineWidth = 8 * 1.5 * dpr; // glowIntensity
        ctx.strokeStyle = `rgba(0, 200, 150, ${0.1 * 1.5})`;
        ctx.stroke();
        ctx.lineWidth = 1.5 * dpr;
      }

      // Vertical lines
      for (let x = 0; x < W; x += meshSize) {
        ctx.beginPath();
        for (let y = 0; y < H; y += 5 * dpr) {
          const wave = Math.sin(y * 0.01 + t * 1.2) * waveHeight + Math.sin(x * 0.005 + t) * waveHeight * 0.5;
          const xx = x + wave; if (y === 0) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
        }
        const pulse = Math.sin(t * 2 * 0.7 + x * 0.01) * 0.5 + 0.5;
        const grad = ctx.createLinearGradient(x, 0, x, H);
        grad.addColorStop(0, colors.darkBlue);
        grad.addColorStop(0.3, mix(colors.emerald, colors.gold, pulse));
        grad.addColorStop(0.5, mix(colors.gold, colors.brightGold, pulse * 1.5));
        grad.addColorStop(0.7, mix(colors.brightGold, colors.emerald, pulse));
        grad.addColorStop(1, colors.darkBlue);
        ctx.strokeStyle = grad; ctx.stroke();

        // Glow
        ctx.beginPath();
        for (let y = 0; y < H; y += 5 * dpr) {
          const wave = Math.sin(y * 0.01 + t * 1.2) * waveHeight + Math.sin(x * 0.005 + t) * waveHeight * 0.5;
          const xx = x + wave; if (y === 0) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
        }
        ctx.lineWidth = 8 * 1.5 * dpr;
        ctx.strokeStyle = `rgba(0, 200, 150, ${0.1 * 1.5})`;
        ctx.stroke();
        ctx.lineWidth = 1.5 * dpr;
      }

      // Particles
      for (const p of particles) {
        const cx = W * 0.5, cy = H * 0.5; const dx = cx - p.x, dy = cy - p.y; const dist = Math.hypot(dx, dy) + 1e-3;
        if (LS.active) {
          if (LS.phase === "vortex") {
            const pull = 0.06, spin = 0.015; const nx = dx / dist, ny = dy / dist; const tx = -ny, ty = nx;
            p.x += (nx * pull * dist + tx * spin * dist) * 0.06; p.y += (ny * pull * dist + ty * spin * dist) * 0.06;
          } else if (LS.phase === "trace") {
            const push = 0.12; const nx = dx / dist, ny = dy / dist; p.x -= nx * push * dist * 0.08; p.y -= ny * push * dist * 0.08;
          } else {
            p.x += p.speedX * 0.4; p.y += p.speedY * 0.4;
          }
        } else {
          p.x += p.speedX; p.y += p.speedY; p.x += Math.sin(t + p.y * 0.01) * 0.35 * dpr; p.y += Math.cos(t + p.x * 0.01) * 0.35 * dpr;
        }
        if (p.x > W) p.x = 0; if (p.x < 0) p.x = W; if (p.y > H) p.y = 0; if (p.y < 0) p.y = H;
        const ps = p.size * (0.8 + 0.5 * Math.sin(t * 3 + p.pulseOffset));
        ctx.beginPath(); ctx.arc(p.x, p.y, ps, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.globalAlpha = LS.active ? 0.85 : 1; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, ps * 2, 0, Math.PI * 2); ctx.fillStyle = p.color + "40"; ctx.globalAlpha = 1; ctx.fill();
      }

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, [canvasRef]);
}

const styles = `
:root{ --lee:#39FF14; --lee-ink:#0a0f12; --panel:#0b1018; --panel-2:#0f1725; --edge:#1a2333; --ink:#e6f0ff; --muted:#9fb0c7; --gold-1:hsl(48 95% 65%); --gold-2:hsl(48 85% 55%); --danger:#ff6a5f; }
*{ box-sizing:border-box; margin:0; padding:0 }
html, body, #root{ height:100% }
body{ font-family:Inter, system-ui, Segoe UI, Roboto, Arial, sans-serif; color:var(--ink); background:#070b10; min-height:100vh; overflow:hidden }
#bgFX{ position:fixed; inset:0; z-index:-1; display:block; background:#030806 }
@media (prefers-reduced-motion: reduce){ #bgFX{ display:none } body{ background:#070b10 } }

.card{ width:min(1180px, 96vw); margin:24px auto; background:rgba(11,16,24,.35); border:1px solid rgba(26,35,51,.6); border-radius:20px; box-shadow:0 30px 90px rgba(0,0,0,.55); backdrop-filter:blur(6px); padding:22px 24px; display:grid; grid-template-columns:1fr 1fr; grid-template-areas:"header header" "identity permissions" "cta cta" "footer footer"; gap:14px; max-height:calc(100vh - 48px); overflow:hidden }
@media (max-width:1023px){ body{ overflow:auto } .card{ display:block; max-height:none; } }

.logo{ grid-area:header; display:flex; align-items:center; gap:14px; margin-bottom:6px }
.logo img{ height:160px; width:auto; border-radius:12px; box-shadow:0 8px 40px rgba(57,255,20,.25) }
.logo h1{ font-size:1.65rem; font-weight:700; margin-bottom:4px; line-height:1.2 }
.sub{ color:var(--muted); font-size:1.05rem }

.muted{ color:var(--muted); font-size:1rem }
.small{ font-size:.95rem }

.section{ background:rgba(26,35,51,.15); border:1px solid rgba(26,35,51,.5); border-radius:12px; margin:12px 0; overflow:hidden }
.section summary{ list-style:none; cursor:pointer; display:flex; align-items:center; justify-content:space-between; padding:12px 14px; font-size:1.15rem; font-weight:700 }
.section summary::-webkit-details-marker{ display:none }
.section[open] summary{ background:rgba(26,35,51,.2) }
.section-content{ padding:12px 14px; color:var(--ink); background:transparent }

.check{ display:flex; align-items:center; gap:10px; font-size:1rem; margin:8px 0 }
.check input[type=text], .check input[type=email]{ flex:1; padding:10px 12px; border-radius:10px; border:1px solid rgba(34,48,71,.6); background:rgba(15,21,34,.18); color:var(--ink); backdrop-filter:blur(2px); font-size:1rem }
.select-all{ margin:12px 0 }
.perm-list{ columns:2; column-gap:18px; padding-left:0; margin:4px 0 }
.perm-list .check{ break-inside:avoid; }

.btn{ width:100%; padding:16px 18px; border:none; border-radius:10px; font-weight:800; font-size:1.05rem; background:linear-gradient(135deg, var(--gold-1), var(--gold-2)); color:var(--lee-ink); cursor:pointer; margin-top:18px }
.btn:active{ transform:translateY(1px) }
.error{ color:var(--danger); margin-top:10px; text-align:center; min-height:20px }

.footer-bar{ grid-area:footer; display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:18px; color:var(--muted); background:transparent }
.footer-left a{ color:var(--lee); text-decoration:none }
.footer-right img{ height:120px; width:auto; filter:drop-shadow(0 6px 24px rgba(0,0,0,.45)) }

/* Modals */
.modal{ position:fixed; inset:0; background:rgba(0,0,0,.7); display:none; align-items:center; justify-content:center; z-index:1000 }
.modal.show{ display:flex }
.modal-content{ background:var(--panel); border:1px solid var(--edge); border-radius:12px; padding:20px; max-width:900px; max-height:82vh; overflow:auto }
.modal h2{ margin-bottom:10px }
.modal .close{ float:right; cursor:pointer; color:var(--lee); font-weight:bold }
.modal pre{ white-space:pre-wrap; font-family:inherit }

/* Loading overlay */
.loading-layer{ position:fixed; inset:0; display:none; align-items:center; justify-content:center; z-index:1200; pointer-events:none }
.loading.show{ display:flex }
.loading-card{ pointer-events:auto; width:min(720px, 92vw); background:rgba(11,16,24,.45); border:1px solid rgba(26,35,51,.65); border-radius:16px; padding:18px 20px; backdrop-filter:blur(8px); box-shadow:0 30px 90px rgba(0,0,0,.55) }
.loading-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px }
.loading-title{ font-weight:800; font-size:1.1rem }
.progress{ height:8px; background:rgba(34,48,71,.5); border-radius:999px; overflow:hidden; margin-top:10px }
.progress>i{ display:block; height:100%; width:0%; background:linear-gradient(135deg, var(--gold-1), var(--gold-2)) }
.load-rows{ display:grid; grid-template-columns:1fr auto; gap:6px 12px; margin-top:10px }
.load-rows .ok{ color:#8dffa3 }
.load-rows .wait{ color:#ffd57a }
.fade-out{ animation:fadeOut .6s ease forwards }
@keyframes fadeOut{ to{ opacity:0; transform:translateY(6px) } }
`;

const defaultAvatar = typeof window === 'undefined' ? '' : ""; // will be overridden by props or fallback below
const defaultLogo   = typeof window === 'undefined' ? '' : "";

const AgentLeeLogin: React.FC<AgentLeeLoginProps> = ({ agentLeeSrc, logoSrc, onContinueRoute = "/" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useCanvasBackground(canvasRef);

  const basePath = process.env.NODE_ENV === 'production' ? '/AGENT_LEE_X' : '';
  const avatarSrc = agentLeeSrc || `${basePath}/image/image/AgentLeeavatar.jpeg`;
  const footerLogoSrc = logoSrc || `${basePath}/image/image/logo.jpg`;

  // Identity
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [alias, setAlias] = useState("");
  const [saveProfile, setSaveProfile] = useState(false);
  const [error, setError] = useState("");

  // Permissions (all optional)
  const [perms, setPerms] = useState({
    camera: false, mic: false, notif: false, tel: false, email: false, files: false, apps: false, contacts: false,
  });

  const toggleAll = (checked: boolean) => setPerms({ camera: checked, mic: checked, notif: checked, tel: checked, email: checked, files: checked, apps: checked, contacts: checked });

  // Modals
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Loading
  const [loading, setLoading] = useState(false);

  // Ask optional permissions when chosen
  const askCamera = async () => { if (!perms.camera) return; if (navigator.mediaDevices?.getUserMedia) { try { const s = await navigator.mediaDevices.getUserMedia({ video: true }); s?.getTracks?.().forEach(t=>t.stop()); } catch {} } };
  const askMic = async () => { if (!perms.mic) return; if (navigator.mediaDevices?.getUserMedia) { try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s?.getTracks?.().forEach(t=>t.stop()); } catch {} } };
  const askNotif = async () => { if (!perms.notif) return; if (typeof Notification !== 'undefined') { try { await Notification.requestPermission(); } catch {} } };
  // Do NOT open OS pickers automatically here; keep these as app-level toggles only.
  const askFiles = async () => { /* intentionally no-op to avoid OS picker */ };
  const askContacts = async () => { /* intentionally no-op to avoid Contacts picker */ };

  const startLoadingSequence = () => {
    (window as any).__LEE_LOAD_STATE = { active: true, phase: "vortex" };
    setLoading(true);

    // Progress bar tick + phases
    const phases = { vortex: 2200, trace: 1600, fade: 700 };
    setTimeout(() => { (window as any).__LEE_LOAD_STATE.phase = "trace"; (window as any).startTimeTrace = performance.now(); }, phases.vortex);
    setTimeout(() => { (window as any).__LEE_LOAD_STATE.phase = "fade"; }, phases.vortex + phases.trace);
    setTimeout(() => {
      (window as any).__LEE_LOAD_STATE = { active: false, phase: "idle" };
      setLoading(false);
      // Navigate
      window.location.href = onContinueRoute;
    }, phases.vortex + phases.trace + phases.fade + 60);
  };

  // Continue click
  const onContinue = async () => {
    setError("");
    if (!name.trim() && !email.trim()) { setError("Please provide at least a name or an email."); return; }
    try {
      const payload = { name, email, alias, savedAt: Date.now() };
      localStorage.setItem('agentlee_user', JSON.stringify(payload));
    } catch {}
    // Only request browser permission prompts that do not open external OS dialogs
    await Promise.all([askCamera(), askMic(), askNotif()]);

    // Pre-warm audio output to improve autoplay reliability after navigation
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf; src.connect(ctx.destination); src.start(0);
        // Allow a micro-tick then stop
        setTimeout(() => { try { ctx.close(); } catch {} }, 50);
      }
    } catch {}
    // Warm up Kokoro model so welcome voice is ready quickly
    try { await warmKokoro(); } catch {}
    startLoadingSequence();
  };

  return (
    <div>
      {/* Styles */}
      <style>{styles}</style>

      {/* Background */}
      <canvas id="bgFX" ref={canvasRef} aria-hidden />

      {/* Card */}
      <main className="card" role="main" aria-labelledby="app-title">
        <div className="logo">
          <img src={avatarSrc} alt="Agent Lee Avatar" />
          <div>
            <h1 id="app-title">Agent Lee — MACMILLION Login</h1>
            <div className="sub">Your personal AI instance. 100% under your control.</div>
          </div>
        </div>

        <div className="muted small" style={{ margin: "-6px 0 10px 0", display: "flex", gap: 12, flexWrap: "wrap" as const }}>
          <span>Policies:</span>
          <a href="#" onClick={(e)=>{e.preventDefault(); setShowTerms(true);}}>Terms of Use</a>
          <span>•</span>
          <a href="#" onClick={(e)=>{e.preventDefault(); setShowPrivacy(true);}}>Privacy Policy</a>
        </div>

        {/* Identity */}
        <details className="section" open style={{ gridArea: "identity" }}>
          <summary><h2>Your info for Agent Lee</h2></summary>
          <div className="section-content">
            <p className="muted small">Provide at least a <strong>name</strong> or <strong>email</strong>. Stored locally; editable later in Settings.</p>
            <div className="check"><label htmlFor="user_name">Name</label><input id="user_name" type="text" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} /></div>
            <div className="check"><label htmlFor="user_email">Email</label><input id="user_email" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} /></div>
            <div className="check"><label htmlFor="user_alias">Alias (optional)</label><input id="user_alias" type="text" placeholder="Preferred nickname" value={alias} onChange={e=>setAlias(e.target.value)} /></div>
            <label className="check"><input type="checkbox" checked={saveProfile} onChange={e=>setSaveProfile(e.target.checked)} /> Save name/email on this device</label>
          </div>
        </details>

        {/* Permissions */}
        <details className="section" open style={{ gridArea: "permissions" }}>
          <summary><h2>Permissions requested (all optional)</h2></summary>
          <div className="section-content small">
            <div className="check select-all">
              <input type="checkbox" checked={Object.values(perms).every(Boolean)} onChange={e=>toggleAll(e.target.checked)} />
              <label>Accept all permissions (optional)</label>
            </div>
            <p>Granting them now allows Agent Lee to start with full capabilities. You may skip or change later in Settings.</p>
            <ul className="perm-list">
              <li className="check"><input type="checkbox" checked={perms.camera} onChange={e=>setPerms(p=>({...p,camera:e.target.checked}))} /> <label>Camera — for video calls</label></li>
              <li className="check"><input type="checkbox" checked={perms.mic} onChange={e=>setPerms(p=>({...p,mic:e.target.checked}))} /> <label>Microphone — for voice commands</label></li>
              <li className="check"><input type="checkbox" checked={perms.notif} onChange={e=>setPerms(p=>({...p,notif:e.target.checked}))} /> <label>Notifications — for reminders</label></li>
              <li className="check"><input type="checkbox" checked={perms.tel} onChange={e=>setPerms(p=>({...p,tel:e.target.checked}))} /> <label>Phone &amp; SMS — place/receive calls and texts</label></li>
              <li className="check"><input type="checkbox" checked={perms.email} onChange={e=>setPerms(p=>({...p,email:e.target.checked}))} /> <label>Email — send/receive messages</label></li>
              <li className="check"><input type="checkbox" checked={perms.files} onChange={e=>setPerms(p=>({...p,files:e.target.checked}))} /> <label>Files &amp; media — read PDFs/Docs</label></li>
              <li className="check"><input type="checkbox" checked={perms.apps} onChange={e=>setPerms(p=>({...p,apps:e.target.checked}))} /> <label>Apps &amp; browser — open pages/apps</label></li>
              <li className="check"><input type="checkbox" checked={perms.contacts} onChange={e=>setPerms(p=>({...p,contacts:e.target.checked}))} /> <label>Contacts &amp; calendar — scheduling</label></li>
            </ul>
          </div>
        </details>

        <button className="btn" style={{ gridArea: "cta" }} onClick={onContinue}>Continue (permissions optional)</button>
        <div className="error" role="alert">{error}</div>

        <div className="footer-bar" role="contentinfo" style={{ gridArea: "footer" }}>
          <div className="footer-left small">
            Developed by <a href="https://rapidwebdevelop.com" target="_blank" rel="noopener">rapidwebdevelop.com</a> — a product of <strong>LeeWay Industries</strong>.
          </div>
          <div className="footer-right">
            <a href="https://rapidwebdevelop.com" target="_blank" rel="noopener" aria-label="RapidWebDevelop">
              <img src={footerLogoSrc} alt="RapidWebDevelop Logo" />
            </a>
          </div>
        </div>
      </main>

      {/* Loading Overlay */}
      <div className={`loading-layer ${loading ? 'loading show' : 'loading'}`} aria-hidden={!loading}>
        <div className={`loading-card ${loading ? '' : 'fade-out'}`}>
          <div className="loading-head">
            <div className="loading-title">Preparing Agent Lee…</div>
            <div className="small muted">initializing modules</div>
          </div>
          <div className="progress" aria-label="overall progress"><i id="loadBar" style={{ width: loading ? '100%' : '0%' }} /></div>
          <div className="load-rows small">
            <div>LMS engine</div><div className="ok">✓</div>
            <div>Voice &amp; mic bridge</div><div className="ok">✓</div>
            <div>Camera &amp; media</div><div className="ok">✓</div>
            <div>Apps &amp; browser control</div><div className="ok">✓</div>
            <div>Contacts &amp; calendar</div><div className="ok">✓</div>
            <div>Files &amp; RAG</div><div className="ok">✓</div>
            <div>Notifications</div><div className="ok">✓</div>
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      <div className={`modal ${showTerms ? 'show' : ''}`} role="dialog" aria-modal={showTerms} aria-label="Terms of Service">
        <div className="modal-content">
          <span className="close" onClick={()=>setShowTerms(false)}>×</span>
          <h2>Terms of Service</h2>
          <p>Last Updated: August 15, 2023 — See also <a href="https://rapidwebdevelop.com/research-development.html" target="_blank" rel="noopener">rapidwebdevelop.com/research-development.html</a></p>
          <div style={{ maxHeight: '60vh', overflow: 'auto' }}><pre>{TERMS_TEXT}</pre></div>
        </div>
      </div>

      {/* Privacy Modal */}
      <div className={`modal ${showPrivacy ? 'show' : ''}`} role="dialog" aria-modal={showPrivacy} aria-label="Privacy Policy">
        <div className="modal-content">
          <span className="close" onClick={()=>setShowPrivacy(false)}>×</span>
          <h2>Privacy Policy</h2>
          <p>Last Updated: August 15, 2023 — See also <a href="https://rapidwebdevelop.com/research-development.html" target="_blank" rel="noopener">rapidwebdevelop.com/research-development.html</a></p>
          <div style={{ maxHeight: '60vh', overflow: 'auto' }}><pre>{PRIVACY_TEXT}</pre></div>
        </div>
      </div>
    </div>
  );
};

export default AgentLeeLogin;
