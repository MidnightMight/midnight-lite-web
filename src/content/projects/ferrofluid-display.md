---
title: Ferrofluid display add-on
summary: A round add-on board that makes a bottle of ferrofluid dance, sitting under a ReSpeaker voice board and an ESP32.
status: in-progress
topics:
  - electric
tags:
  - KiCad
  - ESP32
cover: /img/uploads/ferrofluid-v1-1-render-3d.webp
order: 1
featured: true
started: Sep 2026
skills: PCB design, USB-C power delivery, power electronics
tools: KiCad 10, XIAO ESP32S3
cost: ''
video: ''
link: ''
files: []
draft: false
---

## Why I built it

Whenever I watched _Venom_ and similar movies, I found myself imagining a display that could actually _show_ sound as it came out. That’s when the idea hit me: a ferrofluid display would be a really cool thing to build.

Back in uni, I was part of a club that tinkered with all sorts of projects, and one of them was a ferrofluid speaker. It was a neat concept, but it got me thinking: what if I combined it with something I actually needed?

I’d recently set up a local AI assistant through Home Assistant to run things around the house. The one piece missing was a dedicated device for it, something like what the Google Nest Mini is for Google Home. So the plan came together: a ferrofluid smart speaker designed to work with Home Assistant.

Before starting, I searched online to see if anyone had already made one. I only found a single ferrofluid speaker, and it was Bluetooth-only, with no Wi-Fi and no smart home integration. That settled it. If I wanted one, I’d have to build it myself.

## How it works

A Ø100 mm round board sits under a Seeed ReSpeaker XVF3800 and a XIAO ESP32S3 on nylon standoffs. It:

- takes **USB-C power** and asks the charger for 9 V (a CH224A chip handles the USB-PD talk),
- turns that into a clean **5 V rail** with a TPS565208 buck converter,
- drives an **electromagnet** under the bottle with a PWM-switched MOSFET, which makes the ferrofluid move,
- reads **two temperature sensors** so the coil can't cook itself,
- drives an **addressable LED strip** that backlights the bottle.

## The build

Every connection, part choice and calculation is written up with datasheet page references in the project's design notes, and each step gets its own build log below.

## Result

Boards (v1.1) ordered 21 October 2026: five assembled boards from JLCPCB. [Coming soon: photos and video of it working, and what I'd change next time.]
