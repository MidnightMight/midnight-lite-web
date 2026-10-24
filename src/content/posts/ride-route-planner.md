---
title: Building a bike and e-scooter route planner for SE Queensland
description: How the ride route planner works, the rules it follows, and the problems along the way, from fake hills to ferry gangways and Google Maps moving the start onto the street.
date: 2026-10-24
topic: web
project: this-website
cover: /img/uploads/route-planner-desktop.webp
video: ''
draft: false
---

I ride an EUC, and this morning I was planning a trip from home to another part of town when it hit me: “Huh, the new law’s in effect now.” So I went looking for a map app or route planner that would actually follow the rules, something that could find me the most legal route so I wouldn’t get fined for riding on the wrong road or path.

Here’s what I found. Most map apps either send an e-scooter or EUC down roads it isn’t allowed on, or have no idea what one even is (as an EUC rider, I’ve been on the receiving end of that sometimes).Bike directions are better, but they don’t know Queensland’s rules either.

So I built a planner that does: **Ride Route Planner**. It covers Brisbane, Ipswich, Logan, the Gold Coast and Moreton Bay, and it’s completely free.

I built it in a single morning with Claude doing the heavy lifting on the code while I did what I do best: steering the direction, setting up the framework and fine-tuning the details while having my brekky.

I’m planning to keep it free. If I lose access to the map API, though, I might have to turn it into a paid app or rework it to keep it running.

Here’s a preview:

![The planner on a desktop: a 35 km ride from Redcliffe to the city with a break stop](/img/uploads/route-planner-desktop.webp)

## What it does

- **Pick how you ride first:** bicycle, e-bike, or e-scooter / EUC / e-skateboard. Each gets the roads and paths it's actually allowed on.
- **Bikeways first.** It sticks to bikeways, shared paths and bike lanes, and only uses roads when there's no sensible alternative. You can also pick quiet streets only, no roads at all, or any legal road.
- **Hills,** with climb, descent, steepest grade and an elevation profile, plus a rough battery estimate for e-scooters and e-bikes.
- **CityCat and ferries** when they're quicker than riding around the river.
- **Breaks and rest stops,** rated out of 5 for toilets, water, shelter and seats. (This isn't real user rating just a system to rate it) Note: some toilets or amenities may be out of order and I don't know. 
- **Several stops** in one trip can be planned.
- **Take it with you:** turn-by-turn steps with Street View links, GPX, a large-print PDF, and Google Maps links (with  QR codes on the printout).

![On a phone: pick how you ride, then the route with a stop on the way](/img/uploads/route-planner-phone.webp)

## The rules it follows

Queensland changed the rules on 1 July 2026. For e-scooters, e-skateboards and EUCs (PMDs) Here's a brief version:

- paths of every kind are fine unless there's a "no PMD" sign, at 12 km/h on footpaths and 25 km/h elsewhere;
- roads and on-road bike lanes only where the speed limit is 60 km/h or less;
- on faster roads, only bike lanes that are physically separated from traffic.

Bicycles can use any road unless it's signed "no bicycles", plus footpaths and shared paths. E-bikes go where bicycles go, but at 12 km/h on footpaths. One-way streets apply to everyone, except where bicycles are exempted (and that exemption doesn't cover PMDs).

Rules change, and a planner that silently gets them wrong is worse than none. So the page shows a table of exactly what it does with each kind of path and road for your ride type, the date I last checked the rules, links to the qld.gov.au pages, and an email link if something is out of date. 

**IMPORTANT INFO: (The Law interpretation is checked by Claude so AI can still get it wrong.) Please check it yourself and do email me if you find the description or path planning gets some detail wrong. :)** 

![The rules table, turn-by-turn steps with a rest stop, and the Google Maps parts](/img/uploads/route-planner-panels.webp)

## How it works

**The map data.** Everything starts from OpenStreetMap. A script on my home server downloads the Australia extract (about 1 GB), cuts out SEQ, and sorts every path and road into a kind (bikeway, shared path, footpath, quiet street, main road, road over 60 km/h, crossing, track, ferry). It also records the surface, one-way rules, "no bicycles" and "dismount" signs, street names and nearby rest stops. Ways nobody may ride, like motorways and private roads, are left out.

**Making it small enough for a phone.** That's about 500,000 junctions and 660,000 path segments. The first version was 15.5 MB. Storing each point as a small difference from the one before, simplifying path shapes to within 1.5 m, and sorting junctions so neighbours sit together got it to 5 MB. Names, hills and 17,400 rest stops brought it back up to 7 MB. It downloads once and your browser keeps it.

**Finding the route.** The route search (A\*, the classic shortest-path method) runs in your browser in the background, so the page stays responsive. Every segment gets a cost: its length times a factor for its kind (a bikeway costs 1, a main road a lot more, an illegal road is never used), plus extra for climbing, rough surfaces and crossings. Your options just change those factors, so there's nothing to download again. A cross-city route takes 10 to 30
milliseconds.

**Privacy.** Because the route is worked out on your device, your start and finish never come to me. Place search uses Photon (komoot) and the map tiles come from OpenStreetMap.

## Things that went wrong (and what fixed them)

**Fake hills.** The first elevation data was a 30 m satellite model. It measures the top of whatever is there, trees
and roofs included, so a bikeway under a row of fig trees looks like a roller coaster. On the Goodwill Bridge it found a 21 % pinch. Geoscience Australia publishes a LiDAR model of the bare ground (CC BY 4.0) that covers almost all of SEQ, so the planner uses that, at about 10 m detail. Bridges and tunnels are also drawn as a straight line between their ends, because any terrain model sees the river under a bridge, not the deck.

![The same 4.8 km ride: the satellite surface model shows 92 m of climbing and a 19 % pinch; LiDAR shows 33 m and 5 %](/img/uploads/route-planner-elevation.webp)

**Paths that go nowhere.** OpenStreetMap has lots of small path fragments that don't connect to anything. Tapping near one gave "no route". Now the planner only snaps your start and finish to pieces of the network that are properly connected.

**The CityCat was unreachable.** Ferry gangways and pontoons are tagged "dismount", and I first treated that like "no bicycles". So no bike route could board a ferry, and the UQ campus (which has dismount zones) was cut off. Dismount just means walk your bike, so those bits are now walked at 5 km/h and the route tells you. The pontoons themselves often aren't joined to any path either, so the builder links each one to the nearest path.

**The Green Bridge was missing.** The Eleanor Schonell Bridge is mapped as a bus road with bike and foot lanes, and I'd excluded bus roads entirely. Bus roads that allow bikes now count as shared paths.

**Google Maps.** Google's bike directions are great for turn-by-turn, so the planner can hand the route over as links: each part is a start, up to 9 pins and a finish. Two things needed fixing after testing on a phone. Google moves a link's start onto the nearest street, then plans its own way from there, so each part now starts with a pin 60 m along the bike path. And switching to the next part in the middle of a busy bikeway isn't safe, so parts now end at a rest stop where you can pull off the path.

## Made for printing too

Not everyone wants to ride with a phone. The printout uses large text and gives each turn a close-up of the intersection with an arrow. It includes the hills and warnings, plus a QR code for each Google Maps part, so you can scan it from the paper when you're ready.

![The printout: overview map and profile, QR codes for the Google Maps parts, and turn close-ups](/img/uploads/route-planner-printout.webp)

## What it can't know

- Map data can be wrong or out of date.
- “No PMD” signs and council bans on malls and esplanades are rarely mapped, and speed limits are sometimes missing. The route will tell you when it had to guess.
- Shared e-scooters have their own operator no-ride and slow zones, which the planner doesn’t know about.
- Weather, road conditions and construction work aren’t factored in, since they’re rarely documented in map data.
- **Signs on the ground and the road rules always win.**

## How it was made

I built this with Claude (Anthropic's AI) as an assistant. It wrote most of the code, researched the rules and data sources, and tested routes; I decided what it should do and tested it, including the Google Maps hand-off on my phone.

## Try it

[Open the ride route planner](/tools/route-planner/). On a phone, tap the map to set the start and finish, or use
your location.
