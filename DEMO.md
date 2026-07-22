# PRAHARI Demo Script

## The story

A citizen receives a frightening call from someone claiming to be the CBI. The caller uses a parcel story, fake legal authority, isolation, and urgency to push the citizen toward payment. PRAHARI warns the citizen while the call is still happening, keeps the result private, and gives the citizen immediate next steps. Only after the citizen chooses to share specific warning signs does the report enter the officer dashboard, where shared identifiers reveal a wider fraud ring.

## Before presenting

1. Run `scripts/demo_seed.sh` and confirm both pages load.
2. Open `http://localhost:3000/check` in the first browser tab.
3. Keep `http://localhost:3000/command` ready in a second tab, but reload it only after sharing the citizen report.
4. Use a desktop browser at normal zoom. Keep the browser console closed.
5. Do not use the real microphone during the judged demo. Use **Run live demo** for a predictable result.

## 3-minute show-and-tell

### 0:00-0:20 - Open with the human problem

**Show:** The top of the **Check a scam** page. Keep the heading, the three input choices, and the privacy message visible.

**Say:**

> A digital-arrest scam succeeds by creating panic before a victim has time to verify the story. PRAHARI protects that decision window. A citizen can check a live call, paste a message, or upload a text file without creating an account. Most importantly, nothing is shared without their permission.

### 0:20-0:45 - Show language and privacy choice

**Show:** Briefly open the **Spoken language** menu, then close it. Point to **Fast mode**, **Private mode**, and the privacy bar. Do not start the microphone.

**Say:**

> PRAHARI supports English and India's 22 scheduled languages. Fast mode gives immediate browser speech recognition and clearly warns that the browser may process audio online. Private mode uses offline Whisper on the device. The interface changes its privacy message with the selected engine, so the user always knows where processing happens.

### 0:45-1:15 - Let PRAHARI interrupt the scam

**Show:** Click **Run live demo**. Keep the live transcript and five phase boxes visible while the story progresses: **Scam story**, **Fake authority**, **Fake proof**, **Isolation**, and **Payment**. Let the demo finish without clicking anything else.

**Say while it runs:**

> The transcript grows as the call continues. PRAHARI checks the latest words and maps the manipulation pattern in real time. The caller begins with a parcel story, claims CBI authority, invents evidence, and tries to isolate the citizen. PRAHARI does not wait for money to move. It interrupts when the risk becomes critical.

### 1:15-1:45 - Show the intervention, not a technical score

**Show:** The red **Stop. Do not send money.** result. Point to **Your evidence has not been shared**, **Call 1930 now**, and **Call someone I trust**. Scroll to **How the caller tried to pressure you** and **Words that raised the warning**. Open **See why PRAHARI warned you**.

**Say:**

> The citizen gets one clear instruction: stop and do not send money. The result is still private. PRAHARI offers the national 1930 helpline and a trusted-contact action, then explains the warning in ordinary language. It shows the detected pressure phases and the exact words that raised concern, such as CBI, narcotics parcel, and arrest.

### 1:45-2:05 - Show practical recovery actions

**Show:** Open **More help and reporting options**. Point to **Check number on NCRP**, **Save evidence**, and **Copy complaint**. Scroll just enough to show the **Ready-to-use complaint** section; do not open NCRP during the demo.

**Say:**

> PRAHARI also helps the citizen act after the warning. They can check an identifier on the official NCRP site, save an evidence packet, or use the generated complaint draft. PRAHARI assists the report; it does not submit anything automatically.

### 2:05-2:30 - Make consent the turning point

**Show:** Open **Help warn other people (optional)**. Select **After 24 hours**. Point to the preview and the three choices. Click **Share warning signs only**.

**Say:**

> Until this moment, the conversation has stayed private. Now the citizen decides whether to help warn others. They can share only warning signs, share a version with private details hidden, or share nothing. I will share only the warning signs and set them to expire after 24 hours. This is explicit, limited, revocable consent.

**After the click, show:** The shared status, uploaded byte count, retention time, and consent receipt controls that appear on the page.

**Say:**

> PRAHARI now shows exactly how much evidence was shared and for how long. The citizen can print a consent receipt or withdraw consent from this page.

### 2:30-2:55 - Turn one warning into public-safety intelligence

**Show:** Switch to `http://localhost:3000/command` and reload once. Point to **Database API: Online Syncing** and the KPI cards. In the search box, type `Anonymous Citizen`. Open the matching report with **Inspect** and show that the submitted transcript contains only the consented evidence. Close the incident file and clear the search.

**Say:**

> With consent, the anonymous report reaches the Public Safety Intelligence Room. Officers can search and inspect the report, classify its status, and see only the evidence the citizen approved. This closes the citizen-to-officer loop without making surveillance the default.

### 2:55-3:20 - Reveal the network

**Show:** Scroll to **Fraud Ring Intelligence**. Select the first high-index ring. Point to the graph, the multi-city ring summary, and **Top Hub Identifiers**, including shared UPI IDs, phone numbers, or bank accounts. If the red live-join banner is visible, point to it.

**Say:**

> One report can look isolated. Across consented reports, shared identifiers reveal coordinated infrastructure. PRAHARI groups connected reports into rings, ranks high-connectivity hubs, and shows officers which UPI IDs, phone numbers, and bank accounts connect the campaign across cities. The citizen sees a warning; the officer sees the network behind it.

### 3:20-3:35 - Close with the promise

**Show:** Keep the fraud-ring graph and hub list on screen.

**Say:**

> PRAHARI stops the scam before the money moves. It gives citizens immediate, explainable protection in their language, keeps evidence private by default, and turns only consented warning signs into fraud-ring intelligence that can protect the next person.

## If judges ask about evaluation

**Show:** Scroll to the **Offline safety benchmark** strip on the officer page.

**Say:**

> The website includes a reproducible 120-case English, Hindi, and Hinglish deterministic benchmark. It is clearly labelled as a synthetic prototype benchmark, not field or production validation.

## What not to show or claim

- Do not open backend API documentation or a terminal during the main story.
- Do not claim that PRAHARI automatically files an NCRP complaint.
- Do not claim that Family Shield sends a real SMS; present it as the on-screen trusted-contact alert flow.
- Do not describe the synthetic benchmark as real-world accuracy.
- Do not claim that Fast mode is fully private; the website explicitly warns that the browser may process speech online.
- Do not claim that anything is uploaded before the **Share warning signs only** click.
- Do not quote fixed report or ring counts; they change as the demo is seeded and used.

## Emergency 90-second version

1. Open `/check`, point to **Nothing is shared without your permission**, and click **Run live demo**.
2. When the critical result appears, show **Stop. Do not send money**, **Call 1930 now**, the detected phases, and highlighted evidence.
3. Open the optional sharing panel, choose **After 24 hours**, and click **Share warning signs only**.
4. Open `/command`, search for `Anonymous Citizen`, then scroll to **Fraud Ring Intelligence**.
5. Close with: "Private by default for the citizen; connected intelligence for officers, only after consent."
