---
title: Picking a coil driver that won't cook itself
description: MOSFETs, flyback diodes and the maths for how warm it gets.
date: 2026-10-20
topic: electric
project: ferrofluid-display
draft: true
---

[Draft. Intro: what this post is about and what you'll learn.]

## The problem

[Each electromagnet pulls about 1.5 A. Switch that fast with the wrong part and it gets hot quickly.]

## The maths

Power lost in the MOSFET: `P = I² × R_DS(on)`. [Fill in with the real part from the design notes.]

> Tip: always add the flyback diode. Ask me how I know.
