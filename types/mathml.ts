export {};

type MathElement = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      math: MathElement & { display?: "block" | "inline" };
      mtable: MathElement;
      mtr: MathElement;
      mtd: MathElement;
      mrow: MathElement;
      mi: MathElement;
      mo: MathElement;
      mn: MathElement;
      mtext: MathElement;
      msub: MathElement;
      mfrac: MathElement;
      msqrt: MathElement;
    }
  }
}
