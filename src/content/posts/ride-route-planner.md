---
title: A route planner for bikes, e-scooters and EUCs in SE Queensland
description: A free planner that sticks to bikeways, only uses roads your ride is allowed on under Queensland's 2026 rules, counts the hills and can hand the route to Google Maps.
date: 2026-10-24
topic: web
cover: /img/tools/route-planner.jpg
draft: true
---

Most maps apps either send an e-scooter or EUC down a road it isn't allowed on, or have no idea what one is. Bike
directions are better, but they don't know Queensland's rules either. So I built one: the [ride route planner](/tools/route-planner/). It covers Brisbane,
Ipswich, Logan, the Gold Coast and Moreton Bay, and it's free.

![The route planner showing a ride across the Brisbane River](/img/tools/route-planner.jpg)

## What it does

- **Pick how you ride first:** bicycle, e-bike, or e-scooter / EUC / e-skateboard. Each one gets the roads and paths
  it's actually allowed on.
- **Bikeways first.** It sticks to bikeways, shared paths and bike lanes, and only uses roads when there's no sensible
  alternative. You can also go quiet streets only, no roads at all, or any legal road.
- **Queensland's rules, written down.** Since 1 July 2026, e-scooters and other PMDs can use roads up to 60 km/h, but
  not faster ones unless the bike lane is physically separated. Bikes can use any road unless it's signed "no
  bicycles". A table on the page shows exactly what the planner does with each kind of path and road, with the date I
  last checked the rules and the sources.
- **Hills.** Climb, descent, steepest grade and an elevation profile, from Geoscience Australia's LiDAR terrain model.
  E-scooters and e-bikes also get a rough battery estimate.
- **CityCat and ferries,** when they're quicker than riding around the river.
- **Breaks and rest stops.** Ask for a break every 30 minutes or every hour, and it picks a rest stop near that point,
  rated out of 5 stars for toilets, water, shelter and seats.
- **Several stops** in one trip, like Google Maps.
- **Take it with you:** turn-by-turn steps with Street View links, a GPX file, a large-print PDF with a close-up of
  each turn, or Google Maps links (and QR codes on the printout) that open the route in Google's bike navigation.

## How it works

The map data comes from OpenStreetMap. A script on my home server turns every path and road in the region into a
compact 7 MB file: what kind of way it is, its surface, speed limit, one-way rules, and how much it climbs. Your
browser downloads that once and works out the route itself, so nothing about your trip is sent to me. Place search
uses Photon, and the map comes from OpenStreetMap.

## What it can't know

Map data can be wrong or out of date. "No PMD" signs and council bans on malls and esplanades are rarely mapped, and
speed limits are sometimes missing (the route tells you when it had to guess). Signs on the ground and the road rules
always win. If a rule or a path is wrong, there's a link on the page to let me know.

## How it was made

I built this with Claude (Anthropic's AI) as an assistant. It wrote most of the code, researched the rules and data
sources, and tested routes; I decided what it should do and tested it.

## Try it

[Open the ride route planner](/tools/route-planner/). It works on your phone too: tap the map to set the start and
finish, or use your location.
