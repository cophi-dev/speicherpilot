export {};

type MathElement = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
  mathvariant?: "normal";
};

declare module "react" {
  // JSX intrinsic elements are still declared on this namespace.
  // eslint-disable-next-line @typescript-eslint/no-namespace
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
      munder: MathElement;
      mfrac: MathElement;
      msqrt: MathElement;
    }
  }
}
