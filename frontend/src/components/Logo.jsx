// The school logo, from the public folder (public/School logo.png).
// It sits on a white tile so it stays readable on the navy background.
export const LOGO_SRC = "public/school logo.png";

export default function Logo({ size = "size-12" }) {
  return (
    <span className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-xl bg-paper shadow-sm`}>
      {/* decorative: the school name always appears next to it */}
      <img src={LOGO_SRC} alt="School Logo" className="size-full scale-125 object-contain" />
    </span>
  );
}
