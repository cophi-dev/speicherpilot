/** Tabular digits, with a proportional decimal separator so the comma does not take a digit width. */
export function MonoNumber({ value }: { value: string }) {
  const parts = value.split(/([,.])/);
  return (
    <span className="num">
      {parts.map((part, index) =>
        part === "," || part === "." ? (
          <span key={index} className="num-sep">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
}
