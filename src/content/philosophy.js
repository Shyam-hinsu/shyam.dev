export const philosophy = {
  eyebrow: 'Engineering approach',
  title: 'Principles I keep coming <em>back</em> to.',
  quote: {
    text: 'The interesting problems in frontend are rarely about drawing a button. They are about keeping a system understandable as it grows.',
    attribution: 'Shyam Hinsu',
  },
  principles: [
    {
      title: 'Maintainable over clever',
      text: 'Code is read far more than it is written. I optimise for the next engineer: small components, explicit data flow, names that say what things are.',
    },
    {
      title: 'Reusable by design',
      text: 'A component is reusable when its contract is narrow and its behaviour is predictable. I extract patterns after they repeat, not before.',
    },
    {
      title: 'Performance is a feature',
      text: 'Measure first, then fix the real bottleneck. Keep heavy work off the main thread, update instead of re-create, render only what is visible.',
    },
    {
      title: 'Accessible by default',
      text: 'Semantic markup, keyboard paths and visible focus are part of done. Colour carries meaning only together with text or shape.',
    },
    {
      title: 'Responsive, not shrunk',
      text: 'Mobile gets its own layout decisions. Dense enterprise screens especially need deliberate choices about what to show first.',
    },
    {
      title: 'Collaboration over hand-off',
      text: 'Agree on the data contract and interaction model with design and backend early. Most rework comes from assumptions made alone.',
    },
    {
      title: 'Quality is a habit',
      text: 'Reviewable pull requests, tests where logic lives, and tooling that catches mistakes before people have to.',
    },
    {
      title: 'Keep learning',
      text: 'Vue 3, modern CSS, AI-assisted workflows: the tools change, the fundamentals compound. I keep both moving.',
    },
  ],
}
