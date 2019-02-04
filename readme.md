<p align="center">
  <img src="https://i.imgur.com/QZownhg.png" width="240" />
</p>

<br />
<br />
<br />

**react-spring** is a *set of simple, spring-physics based primitives* (as in building blocks) that should cover most of your UI related animation needs once plain CSS can't cope any longer. Forget easings, durations, timeouts and so on as you fluidly move data from one state to another. This isn't meant to give each and every problem a specific solution, but rather to give you tools flexible enough to confidently cast your ideas into moving interfaces, or introduce motion to the static.

[![Build Status](https://travis-ci.org/drcmda/react-spring.svg?branch=master)](https://travis-ci.org/drcmda/react-spring) [![npm version](https://badge.fury.io/js/react-spring.svg)](https://badge.fury.io/js/react-spring) [![Join the community on Spectrum](https://withspectrum.github.io/badge/badge.svg)](https://spectrum.chat/react-spring) <span class="badge-patreon"><a href="https://www.patreon.com/0xca0a" title="Donate to this project using Patreon"><img src="https://img.shields.io/badge/patreon-donate-yellow.svg" alt="Patreon donate button" /></a></span> [![Backers on Open Collective](https://opencollective.com/react-spring/backers/badge.svg)](#backers) [![Sponsors on Open Collective](https://opencollective.com/react-spring/sponsors/badge.svg)](#sponsors)

### Installation

    npm install react-spring

### Documentation and Examples 

Hooks: **[react-spring-hooks.surge.sh](https://react-spring-hooks.surge.sh/)**

Render-props: **[react-spring.surge.sh](https://react-spring.surge.sh/)**

---

### Why springs and not durations

The most basic principle you will be working with is called a `spring`. A spring *does not have a curve, it does not have a duration, it is physics based*! Think of a weight attached to a spring:

<p align="middle">
  <img width="400" src="https://s3-eu-west-1.amazonaws.com/functionsandgraphs/animation+of+a+spring+vibrating+up+and+down.gif" />
</p>

Let the weight loose and it rushes down, coming to rest when the force is overcome. Yank the spring up and it will expend its energy and move up according to its momentum. Time based animation on the other hand would have it drop down in an arbitrary timeframe, say 2 seconds. Pull up mid-air and it would stop naively, then move back 2 seconds again. No matter which curve you choose, it will never look natural.

*Durations and easings are the number one reason UI animation is hard*, and usually looks bad. We are so used to it that we don't question it any longer. We think it is just the way it is when we have to deal with curves, easings, time waterfalls, not to mention getting this all in sync.

Springs change that, they make animation easy and approachable, everything you do with them is fluid by default. Watch the next couple of minutes of [this video](https://www.youtube.com/embed/1tavDv5hXpo?controls=0&amp;start=370) in which Cheng Lou (the author of react-motion) explains it perfectly.

### What others say

<p align="middle">
  <img src="assets/testimonies.jpg" />
</p>

### Used by

<p align="middle">
  <a href="https://nextjs.org/"><img width="285" src="assets/projects/next.png"></a>
  <a href="https://codesandbox.io/"><img width="285" src="assets/projects/csb.png"></a>
  <a href="https://aragon.org/"><img width="285" src="assets/projects/aragon.png"></a>
</p>

And [many others](https://github.com/drcmda/react-spring/network/dependents) ...

## Funding

If you like this project, please consider helping out. All contributions are welcome as well as donations to [Opencollective](https://opencollective.com/react-spring), or in crypto: 36fuguTPxGCNnYZSRdgdh6Ea94brCAjMbH (BTC) or 0x6E3f79Ea1d0dcedeb33D3fC6c34d2B1f156F2682 (ETH).

You can also support this project by becoming a sponsor. Your logo will show up here with a link to your website.

## Gold sponsors

<a href="https://aragon.org/">
  <img width="300" src="https://wiki.aragon.org/design/logo/svg/imagetype.svg"/>
</a>

## Sponsors

<a href="https://opencollective.com/react-spring/sponsor/0/website" target="_blank">
  <img src="https://opencollective.com/react-spring/sponsor/0/avatar.svg"/>
</a>
<a href="https://opencollective.com/react-spring/sponsor/1/website" target="_blank">
  <img src="https://opencollective.com/react-spring/sponsor/1/avatar.svg"/>
</a>

## Backers

Thank you to all our backers! 🙏

<a href="https://opencollective.com/react-spring#backers" target="_blank">
  <img src="https://opencollective.com/react-spring/backers.svg?width=890"/>
</a>

### Contributors

This project exists thanks to all the people who contribute.

<a href="https://github.com/drcmda/react-spring/graphs/contributors">
  <img src="https://opencollective.com/react-spring/contributors.svg?width=890" />
</a>
