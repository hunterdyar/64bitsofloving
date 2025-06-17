declare module './challenges.toml' {
  interface Challenge {
    title: string;
    description: string;

  }

  const value: Challenge[];
  export default value;
}