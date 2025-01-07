const experiments = [
  {
    id: '1',
    variant: "B",
    options: "opt1=true",
    percentGtrThan: 50,
    percentLessOrEqThan: 100,
    urls: ['/']
  },
  {
    id: '2',
    variant: "B",
    options: "opt2=false",
    percentGtrThan: 25,
    percentLessOrEqThan: 75,
    urls: []
  }
];

export { experiments };