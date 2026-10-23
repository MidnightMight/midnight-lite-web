---
title: Ferrofluid display add-on
summary: A round add-on board that makes a bottle of ferrofluid dance, sitting under a ReSpeaker voice board and an ESP32.
status: in-progress
topics: [electric]
tags: [KiCad, ESP32]
order: 1
featured: true
started: Sep 2026
cover: /img/uploads/ferrofluid-v1-1-render-3d.webp
skills: PCB design, USB-C power delivery, power electronics
tools: KiCad 10, XIAO ESP32S3
---

## Why I built it

[Write this in your own words: the idea, the inspiration, and why ferrofluid.]

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
