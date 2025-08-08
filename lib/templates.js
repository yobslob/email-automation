export const subjectTemplate = (data) => `${data.Name} doesn’t deserve ${data.LessSubs} followers.`;

export const bodyTemplates = [
    (data) => `
    Hi ${data.Name},
    I was watching your reel "${data.VideoName}", and I was like—this guy has such a crazy rich man lifestyle which I came to know about from your highlight on ${data.PrimaryPlatform === "yt" ? "Youtube" : (data.PrimaryPlatform === "ig" ? "Instagram" : data.PrimaryPlatform)}. It’s not just good, it’s the kind of thing that makes people stop scrolling. Naturally, I checked out your ${data.SecondaryPlatform === "yt" ? "Youtube" : (data.SecondaryPlatform === "ig" ? "Instagram" : data.SecondaryPlatform)} and no offense, but I was honestly flabbergasted that I couldn’t find you just by name. When I finally got there through the links, I noticed you haven’t really delved into editing your videos—which is exactly what I help with:
    - Taking the load of managing and optimizing the account so you can focus on the bigger picture.
    I see you wanna get into ${data.SecondaryPlatform === "yt" ? "Youtube" : (data.SecondaryPlatform === "ig" ? "Instagram" : data.SecondaryPlatform)} to eventually boost your business and build a community. I’ve edited and managed over 650+ videos for people on ${data.SecondaryPlatform === "yt" ? "Youtube" : (data.SecondaryPlatform === "ig" ? "Instagram" : data.SecondaryPlatform)} which lets me hear that you don’t deserve ${data.LessSubs} followers—bro, the value you have!! You should be in 100k’s easily, just need the right guy who knows how to edit and set up content for you.
    So, if you’re curious, just reply to this, and I’ll share the thought—no pressure, just something I think you might find useful.
    Btw here's work and people we've worked with: <a href="https://binary-growth.vercel.app/">Binary Growth</a>
    Keep doing what you’re doing, it’s exciting to see where this could go.
  `,
    (data) => `
    Hi ${data.Name},
    I was watching your reel titled "${data.VideoName}", and honestly—I thought, this guy has such a crazy rich man lifestyle that I first saw on your highlight on ${data.PrimaryPlatform === "yt" ? "Youtube" : (data.PrimaryPlatform === "ig" ? "Instagram" : data.PrimaryPlatform)}. It’s seriously the kind of thing that makes people stop in their tracks. Naturally, I explored your ${data.SecondaryPlatform === "yt" ? "Youtube" : (data.SecondaryPlatform === "ig" ? "Instagram" : data.SecondaryPlatform)} and to be real, I was a bit shocked I couldn’t find you immediately by name. When I finally got there via the links, I noticed you haven’t dived into editing—which is exactly what I specialize in:
    - Taking over the work of optimizing and managing your presence so you can stay focused on the big picture.
    I can see you’re aiming to grow on ${data.SecondaryPlatform === "yt" ? "Youtube" : (data.SecondaryPlatform === "ig" ? "Instagram" : data.SecondaryPlatform)} to strengthen your business and build a strong audience. I’ve handled and edited 650+ videos for other creators on ${data.SecondaryPlatform === "yt" ? "Youtube" : (data.SecondaryPlatform === "ig" ? "Instagram" : data.SecondaryPlatform)} which makes me believe you don’t deserve only ${data.LessSubs} followers—you should be hitting 100k’s with ease. You just need someone who gets how to edit and build your content strategy.
    If you’re interested, reply back—I’ll send over some ideas, no pressure at all.
    Oh—and here’s my portfolio and examples of clients: <a href="https://binary-growth.vercel.app/">Binary Growth</a>
    Keep up the great work—it’s exciting to see what you’ll do next.
  `,
    (data) => `
    Hey ${data.Name},
    I came across your reel "${data.VideoName}", and man—I was thinking, this guy lives such a crazy rich lifestyle which I first noticed on your ${data.PrimaryPlatform === "yt" ? "Youtube" : (data.PrimaryPlatform === "ig" ? "Instagram" : data.PrimaryPlatform)} highlights. It’s the sort of content that just makes people stop scrolling. Naturally, I had to look you up on ${data.SecondaryPlatform === "yt" ? "Youtube" : (data.SecondaryPlatform === "ig" ? "Instagram" : data.SecondaryPlatform)} and no kidding—I was surprised I couldn’t find you right away by name. When I finally found your profile via the links, I saw you haven’t gone deep into editing yet—which is exactly what I help people with:
    - Handling all the editing and account optimization so you can focus on scaling your impact.
    It’s clear you’re trying to grow on ${data.SecondaryPlatform === "yt" ? "Youtube" : (data.SecondaryPlatform === "ig" ? "Instagram" : data.SecondaryPlatform)} to boost your business and build an audience. I’ve personally edited and managed over 650 videos for other creators there, and honestly—you don’t deserve only ${data.LessSubs} followers. With the value you bring, you should easily be over 100k followers. You just need the right editor to help you stand out.
    If you’re open to it, reply to this email and I’ll share my ideas—no pressure, purely value.
    Here’s my work and examples: <a href="https://binary-growth.vercel.app/">Binary Growth</a>
    Keep crushing it—really curious to see where this goes.
  `,
];