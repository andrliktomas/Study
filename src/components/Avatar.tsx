/* eslint-disable @next/next/no-img-element */
export function Avatar({ name, image, size = 48 }: { name?: string | null; image?: string | null; size?: number }) {
  const initials = (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (image)
    return (
      <img src={image} alt={name ?? ""} width={size} height={size} className="rounded-full object-cover ring-2 ring-white" style={{ width: size, height: size }} />
    );
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-300 to-brand-600 font-semibold text-white ring-2 ring-white"
      style={{ width: size, height: size, fontSize: size / 2.6 }}
    >
      {initials}
    </span>
  );
}
