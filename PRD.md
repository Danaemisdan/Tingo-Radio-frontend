.

📻 PRODUCT REQUIREMENTS DOCUMENT
Product: Fully AI-Operated Radio Station (Single-Node Core)
1. Product Vision

Create a fully autonomous AI-driven radio station that:

Streams 24/7 from a single host machine

Automatically queues and plays music

Uses local AI to generate DJ talk breaks

Accepts listener voice calls and text requests

Hosts scheduled AI-generated shows

Streams seamlessly to website visitors

Can scale listener distribution without scaling AI compute

The AI brain and audio engine run locally. Distribution scales separately.

2. High-Level Architecture
Core Principle:

One PC = AI brain + audio engine
Streaming distribution can scale independently.

[Music Library]
        ↓
[Queue Engine]
        ↓
[AI DJ Engine] ←→ [LLM]
        ↓
[TTS Engine]
        ↓
[Audio Mixer]
        ↓
[Live Stream Output]
        ↓
[HLS / WebRTC Server]
        ↓
[Website Player]

For calls:

Listener → WebRTC → STT → LLM → TTS → Mixer → Broadcast
3. Functional Requirements
3.1 Continuous Streaming

FR-1: The station must stream continuously 24/7.

FR-2: If no AI segment is scheduled, music auto-plays.

FR-3: No dead air under any circumstance.

FR-4: Stream must support:

Web playback (browser)

Mobile playback

Optional external relay (Icecast-compatible)

3.2 AI DJ System

FR-5: AI generates:

Song intros

Song outros

Commentary

Themed segments

Show transitions

FR-6: DJ personality must be configurable:

Tone (hype, chill, sarcastic, news-style)

Station branding

Language filters

FR-7: AI must be aware of:

Last 3 songs played

Upcoming song

Time of day

Listener messages

Show format

FR-8: DJ talk breaks must auto-limit duration (10–30 sec default).

3.3 Music Queue Engine

FR-9: Queue must:

Avoid repeat artist within X minutes

Avoid repeat track within Y hours

Support genre rotation

Support energy curve logic

FR-10: Listener requests must:

Be validated

Be insertable into queue

Respect repeat rules

FR-11: Support:

Manual override

Emergency playlist fallback

3.4 AI-Hosted Shows

FR-12: Admin can define show blocks:

Example: “Drive Time 4PM–6PM”

Example: “Late Night Chill”

FR-13: Each show defines:

Tone

Music category rules

Segment cadence (e.g., talk every 2 songs)

FR-14: Show transitions must be seamless.

3.5 Listener Interaction
Text Interaction

FR-15: Listeners can:

Send song requests

Send shoutouts

Send messages to DJ

FR-16: AI can read selected messages on-air.

Voice Calls (Live)

FR-17: Listener can initiate WebRTC call.

FR-18: System must:

Transcribe call (STT)

Pass transcript to LLM

Generate AI response

Convert to TTS

Mix into broadcast

FR-19: Must include:

Call screening

Profanity filtering

Hard mute

Auto disconnect after configurable duration

FR-20: Music must auto-duck under voice.

4. Non-Functional Requirements
4.1 Single PC Operation

NFR-1: Entire AI system runs on one machine:

LLM

STT

TTS

Mixer

Queue engine

NFR-2: Target hardware:

32–64GB RAM

Modern GPU (recommended)

SSD storage

NFR-3: Must operate even without internet (except listener access).

4.2 Scalability Model

Important separation:

AI compute = single machine

Stream distribution = scalable

NFR-4: Core PC outputs:

One master live stream

NFR-5: Distribution options:

HLS segments via CDN

Icecast relay

WebRTC SFU

This allows:

10 listeners → direct serve

10,000 listeners → CDN handles load

AI compute unchanged

4.3 Performance

NFR-6: AI DJ generation latency < 3 seconds

NFR-7: TTS generation < 2 seconds for 20s audio

NFR-8: Call round-trip latency target < 1.5 seconds (WebRTC mode)

4.4 Reliability

NFR-9: If LLM fails → fallback prerecorded filler audio.

NFR-10: If TTS fails → fallback generic stinger.

NFR-11: If queue logic crashes → fallback static playlist.

No silence allowed.

5. System Components
5.1 Core Services (Single Machine)

Queue Service

AI Orchestrator

LLM Runtime (local)

TTS Engine (local)

STT Engine (local)

Audio Mixer

Stream Encoder (FFmpeg)

HLS/WebRTC Output Server

Admin Dashboard

All dockerized.

6. Admin Controls

Admin dashboard must allow:

Start/stop stream

Override queue

Inject manual talk segment

Ban user

Drop call

Change DJ personality

Edit show schedule

View analytics (listeners, CPU, memory)

7. Security & Abuse Controls

Rate limit messages

Rate limit calls

AI profanity filter

Block repeated spam

Per-IP throttle

8. Future Expansion

Multiple AI DJs

Voting-based playlist

Multi-channel station

Advertiser injection engine

AI-generated music

Listener personalization streams

9. Success Metrics

24/7 uptime

Zero dead air incidents

Avg listener session > 10 minutes

<3s AI break generation delay

CPU usage stable under 80%

10. Core Technical Philosophy

Separate:

AI Brain (single node)
from
Stream Distribution (scalable)

That’s how you stay on one PC but scale to thousands of listeners.
