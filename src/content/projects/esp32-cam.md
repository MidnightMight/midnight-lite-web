---
title: ESP32 cam for fun
summary: A DIY Wi-Fi camera that streams live video for home monitoring. No cloud, no subscription, just a tiny chip doing its thing.
status: in-progress
topics: [electric, robots]
tags: [ESP32]
order: 4
featured: true
started: Jul 2025
skills: Embedded C++, networking
tools: ESP32-CAM, Arduino IDE
---

## Why I built it

A DIY home camera built around the ESP32-CAM module. It connects to the home Wi-Fi and streams live MJPEG video to a browser: no cloud subscriptions, no monthly fees. It's an exploration of how much you can squeeze out of a tiny microcontroller, and it's genuinely fun to set up.

## How it works

The ESP32-CAM runs a small web server and streams MJPEG over HTTP on the local network.

## The build

- **Jul 2025:** module arrived; first flash and Wi-Fi test.
- **Aug 2025:** MJPEG stream working.
- **Next:** motion detection, a simple web UI, and recording clips to the SD card.
