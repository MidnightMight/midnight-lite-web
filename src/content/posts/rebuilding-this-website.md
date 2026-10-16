---
title: Rebuilding this website (again)
description: What changed, what got cut, and why the site now centres on videos and build logs.
date: 2026-10-16
topic: site-updates
project: this-website
---

The first version of this site was hand-written HTML and CSS: a few coding projects mashed together, a carousel on the home page, and a "Services" page that was really just a launcher for my own web apps. Later a GitHub bot helped me clean it up a lot. It worked, but it was built for showing a CV, not for what I actually want to do now: make videos, write up builds, and share the whole process.

So I rebuilt it around three things: **projects**, **videos** and **build logs**. Here's what changed and why.

## What moved where

| Old site | New site | Why |
|---|---|---|
| Home (hero + carousel) | Home | One clear pitch, a "now making" strip, the latest video, featured projects and recent posts. |
| Projects + project 1–3 pages | Projects + one case-study layout | Every project gets the same structure: why, how, the build, result, files. |
| (none) | Videos | Hub for the YouTube channel, grouped by series. It fills itself from the channel. |
| Dev Log | Build log | A real blog. This post is the first one. |
| Services | Tools | "Services" sounded like I was selling something. They're free tools; the EUC World visualiser lives here. |
| Contact (footer only) | Contact page | A proper form, plus video suggestions. The placeholder phone number and LinkedIn are gone. |

## Decisions I made

- **Built with Astro.** Posts and projects are Markdown files instead of hand-written HTML pages, so writing a new post takes minutes. It still produces plain, fast pages, served by Cloudflare and deployed automatically from GitHub.
- **An editor in the browser.** I write posts and update projects from a small admin page that saves straight to GitHub. No database, no server to look after.
- **Comments live on YouTube.** No comment system on the site to moderate or keep running. Ask under the video and I'll answer there.
- **A newsletter.** New videos and build logs about twice a month, by email. No spam.
- **Faceless for now.** I'm @midnightlite, and the hexagon logo does the talking.
- **Fewer, better projects.** It starts with the ferrofluid display, the EUC visualiser and this website. More get added as they become worth showing.

## How I built it

The layout started as a clickable prototype that I printed, scribbled on and sent back. The headline on the home page came from that round. The source lives on GitHub and is backed up to my own Git server at home, and every change goes to a preview branch before it reaches the live site.

> Lesson so far: printing a design and attacking it with a pen finds problems much faster than staring at it on a screen.

## What's next

Moving the rest of the content across, then the first ferrofluid build logs to go with the first video on [YouTube](https://www.youtube.com/@midnightlite).
