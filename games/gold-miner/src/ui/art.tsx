// Vector art for the React screens, drawn to match the canvas: ink outlines
// over gradient fills, lit from the top left.
import { useId } from "react";
import type { ShopItem } from "../game/shop.ts";
import { INK } from "../rendering/paint.ts";

/** A React id usable inside `url(#...)`: only word characters and dashes. */
function useSvgId() {
  return `art${useId().replace(/[^\w-]/g, "")}`;
}

/** Outline props shared by every shape. */
const line = {
  stroke: INK,
  strokeWidth: 2.5,
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;

/** A vertical gradient from `top` to `bottom`, with a unique id. */
function Gradient(
  { id, top, bottom, x2 = 0, y2 = 1 }: {
    id: string;
    top: string;
    bottom: string;
    x2?: number;
    y2?: number;
  },
) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
      <stop offset="0" stopColor={top} />
      <stop offset="1" stopColor={bottom} />
    </linearGradient>
  );
}

/** A four-pointed twinkle centered on (x, y). */
function Twinkle({ x, y, size }: { x: number; y: number; size: number }) {
  const s = size;
  const w = size * 0.25;
  return (
    <path
      d={`M${x} ${y - s}L${x + w} ${y - w}L${x + s} ${y}L${x + w} ${
        y + w
      }L${x} ${y + s}L${x - w} ${y + w}L${x - s} ${y}L${x - w} ${y - w}Z`}
      fill="#fffdf0"
      stroke={INK}
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  );
}

export function ShopIcon({ item }: { item: ShopItem }) {
  const id = useSvgId();
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="shop-icon">
      {item === "dynamite" && <Dynamite id={id} />}
      {item === "strength" && <Strength id={id} />}
      {item === "clover" && <Clover id={id} />}
      {item === "book" && <Book id={id} />}
      {item === "polish" && <Polish id={id} />}
    </svg>
  );
}

function Dynamite({ id }: { id: string }) {
  const paper = `${id}-paper`;
  return (
    <>
      <defs>
        <Gradient id={paper} top="#f06a52" bottom="#a8261a" x2={1} y2={0} />
      </defs>
      <path d="M32 14C33 8 38 6 41 5" fill="none" {...line} />
      <Twinkle x={42} y={5} size={5} />
      {[16, 38].map((x) => (
        <rect
          key={x}
          x={x}
          y={18}
          width={11}
          height={40}
          rx={4}
          fill={`url(#${paper})`}
          {...line}
        />
      ))}
      <rect
        x={26.5}
        y={14}
        width={11}
        height={44}
        rx={4}
        fill={`url(#${paper})`}
        {...line}
      />
      <rect
        x={14}
        y={33}
        width={36}
        height={9}
        rx={2}
        fill="#f3e2b8"
        {...line}
      />
      <path
        d="M19 22V30M30 18V30M41 22V30"
        stroke="#fff"
        strokeOpacity="0.45"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </>
  );
}

function Strength({ id }: { id: string }) {
  const glass = `${id}-glass`;
  const brew = `${id}-brew`;
  const bottle =
    "M26 22C26 28 15 29 15 40V54Q15 60 21 60H43Q49 60 49 54V40C49 29 38 28 38 22Z";
  return (
    <>
      <defs>
        <Gradient id={glass} top="#e8f7ff" bottom="#b9d9e8" />
        <Gradient id={brew} top="#ff8a50" bottom="#d84315" />
        <clipPath id={`${id}-in`}>
          <path d={bottle} />
        </clipPath>
      </defs>
      <rect
        x={26}
        y={12}
        width={12}
        height={12}
        fill={`url(#${glass})`}
        {...line}
      />
      <path d={bottle} fill={`url(#${glass})`} />
      <rect
        x={10}
        y={34}
        width={44}
        height={30}
        fill={`url(#${brew})`}
        clipPath={`url(#${id}-in)`}
      />
      <path d={bottle} fill="none" {...line} />
      <rect
        x={24}
        y={5}
        width={16}
        height={9}
        rx={3}
        fill="#c8925a"
        {...line}
      />
      <rect
        x={20}
        y={40}
        width={24}
        height={15}
        rx={3}
        fill="#fff4cf"
        {...line}
      />
      <path
        d="M34 42L27 49H32L29 54L37 46H32Z"
        fill="#ffd23f"
        stroke={INK}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M19 39V52"
        stroke="#fff"
        strokeOpacity="0.7"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>
  );
}

function Clover({ id }: { id: string }) {
  const leaf = `${id}-leaf`;
  // One heart-shaped leaf, its point at the center, turned four ways.
  const heart =
    "M32 28C23 24 17 13 24 9C28 7 31 10 32 13C33 10 36 7 40 9C47 13 41 24 32 28Z";
  return (
    <>
      <defs>
        <Gradient id={leaf} top="#9ee07a" bottom="#3f8f2f" />
      </defs>
      <path
        d="M32 30C33 42 38 50 44 58"
        fill="none"
        stroke={INK}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M32 30C33 42 38 50 44 58"
        fill="none"
        stroke="#4f9a35"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {[0, 90, 180, 270].map((turn) => (
        <g key={turn} transform={`rotate(${turn} 32 28)`}>
          <path d={heart} fill={`url(#${leaf})`} {...line} />
          <path
            d="M32 26V15"
            stroke="#d9f5c4"
            strokeOpacity="0.8"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      ))}
      <circle
        cx={32}
        cy={28}
        r={2.5}
        fill="#3f8f2f"
        stroke={INK}
        strokeWidth="1.5"
      />
      <Twinkle x={51} y={13} size={5} />
    </>
  );
}

function Book({ id }: { id: string }) {
  const cover = `${id}-cover`;
  const rock = `${id}-rock`;
  return (
    <>
      <defs>
        <Gradient id={cover} top="#a8743a" bottom="#6e4320" x2={1} y2={1} />
        <Gradient id={rock} top="#d5d0c6" bottom="#7a746a" x2={1} y2={1} />
      </defs>
      <path d="M45 58V12" stroke={INK} strokeWidth="2.5" />
      <rect
        x={18}
        y={11}
        width={34}
        height={47}
        rx={2}
        fill="#fff6df"
        {...line}
      />
      <path d="M48 16V54M51 15V55" stroke="#d9c7a0" strokeWidth="1.2" />
      <rect
        x={12}
        y={8}
        width={36}
        height={48}
        rx={3}
        fill={`url(#${cover})`}
        {...line}
      />
      <rect
        x={12}
        y={8}
        width={7}
        height={48}
        rx={3}
        fill="#5a3518"
        {...line}
      />
      <rect
        x={23}
        y={13}
        width={20}
        height={5}
        rx={1.5}
        fill="#e8c35a"
        stroke={INK}
        strokeWidth="1.2"
      />
      <path
        d="M23 41L25 32L31 27L39 28L44 34L42 42L34 45L27 45Z"
        fill={`url(#${rock})`}
        {...line}
      />
      <path d="M25 32L31 27L35 34L28 38Z" fill="#fff" fillOpacity="0.4" />
      <path
        d="M28 38L35 34L39 28M35 34L37 40"
        fill="none"
        stroke={INK}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.6"
      />
      <rect x={23} y={47} width={20} height={3} rx={1.5} fill="#e8c35a" />
      <path d="M38 55V63L41 60L44 63V55" fill="#c0392b" {...line} />
    </>
  );
}

function Polish({ id }: { id: string }) {
  const jar = `${id}-jar`;
  const lid = `${id}-lid`;
  return (
    <>
      <defs>
        <Gradient id={jar} top="#e2f6ff" bottom="#93c9e0" x2={1} y2={1} />
        <Gradient id={lid} top="#9575cd" bottom="#5e35b1" />
      </defs>
      <rect
        x={15}
        y={24}
        width={34}
        height={34}
        rx={7}
        fill={`url(#${jar})`}
        {...line}
      />
      <rect
        x={13}
        y={15}
        width={38}
        height={11}
        rx={3}
        fill={`url(#${lid})`}
        {...line}
      />
      <path
        d="M19 18H45"
        stroke="#fff"
        strokeOpacity="0.5"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x={20}
        y={32}
        width={24}
        height={19}
        rx={3}
        fill="#fffdf6"
        {...line}
      />
      <path
        d="M27 39L29 36H35L37 39L32 46Z"
        fill="#56c6ea"
        stroke={INK}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M27 39H37M30 36L32 46L34 36"
        fill="none"
        stroke={INK}
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <path
        d="M19 30V52"
        stroke="#fff"
        strokeOpacity="0.7"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <Twinkle x={53} y={11} size={6} />
      <Twinkle x={9} y={20} size={4} />
    </>
  );
}

/**
 * The storekeeper behind the counter: a round fellow in a green eyeshade,
 * spectacles, and a handlebar mustache. Grins when you buy something.
 */
export function Shopkeeper({ happy }: { happy: boolean }) {
  const id = useSvgId();
  const skin = `${id}-skin`;
  const vest = `${id}-vest`;
  return (
    <svg viewBox="0 0 140 124" aria-hidden="true" className="shopkeeper">
      <defs>
        <radialGradient id={skin} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fde0bd" />
          <stop offset="1" stopColor="#e8ab7c" />
        </radialGradient>
        <Gradient id={vest} top="#a8473a" bottom="#6d2a20" />
      </defs>
      <g className="shopkeeper-body">
        {/* Shirt, vest, and bow tie. */}
        <path
          d="M14 124C16 98 34 84 70 84C106 84 124 98 126 124Z"
          fill="#f5efe0"
          {...line}
        />
        <path
          d="M40 92V124M52 87V124M88 87V124M100 92V124"
          stroke="#9fb4d8"
          strokeWidth="2"
        />
        <path
          d="M18 124C20 102 34 89 56 86L64 124Z"
          fill={`url(#${vest})`}
          {...line}
        />
        <path
          d="M122 124C120 102 106 89 84 86L76 124Z"
          fill={`url(#${vest})`}
          {...line}
        />
        <circle
          cx={66}
          cy={108}
          r={2}
          fill="#e8c35a"
          stroke={INK}
          strokeWidth="1"
        />
        <circle
          cx={74}
          cy={108}
          r={2}
          fill="#e8c35a"
          stroke={INK}
          strokeWidth="1"
        />
        <path
          d="M70 88L56 81V95ZM70 88L84 81V95Z"
          fill="#c0392b"
          {...line}
        />
        <circle cx={70} cy={88} r={4} fill="#e04a3a" {...line} />

        {/* Ears and head. */}
        <circle cx={42} cy={52} r={7} fill="#e8ab7c" {...line} />
        <circle cx={98} cy={52} r={7} fill="#e8ab7c" {...line} />
        <ellipse
          cx={70}
          cy={50}
          rx={28}
          ry={29}
          fill={`url(#${skin})`}
          {...line}
        />
        {/* Gray tufts over the ears; bald and shiny on top. */}
        <path
          d="M41 44C38 36 44 32 48 36C46 30 52 28 54 33C52 38 48 44 44 48Z"
          fill="#8d8178"
          {...line}
        />
        <path
          d="M99 44C102 36 96 32 92 36C94 30 88 28 86 33C88 38 92 44 96 48Z"
          fill="#8d8178"
          {...line}
        />
        <ellipse
          cx={62}
          cy={26}
          rx={9}
          ry={4}
          fill="#fff"
          fillOpacity="0.6"
          transform="rotate(-20 62 26)"
        />

        {/* Green eyeshade. */}
        <path
          d="M40 40Q70 24 100 40L104 48Q70 32 36 48Z"
          fill="#3f9a5a"
          fillOpacity="0.92"
          {...line}
        />

        {/* Eyes behind round spectacles. */}
        <g className={happy ? undefined : "shopkeeper-eyes"}>
          {happy
            ? (
              <path
                d="M54 56Q58 51 62 56M78 56Q82 51 86 56"
                fill="none"
                {...line}
              />
            )
            : (
              <>
                <ellipse cx={58} cy={55} rx={3} ry={3.8} fill={INK} />
                <ellipse cx={82} cy={55} rx={3} ry={3.8} fill={INK} />
                <circle cx={57} cy={53.5} r={1.1} fill="#fff" />
                <circle cx={81} cy={53.5} r={1.1} fill="#fff" />
              </>
            )}
        </g>
        <circle
          cx={58}
          cy={55}
          r={9}
          fill="#fff"
          fillOpacity="0.18"
          stroke={INK}
          strokeWidth="2"
        />
        <circle
          cx={82}
          cy={55}
          r={9}
          fill="#fff"
          fillOpacity="0.18"
          stroke={INK}
          strokeWidth="2"
        />
        <path d="M67 54Q70 51 73 54" fill="none" stroke={INK} strokeWidth="2" />

        {/* Rosy cheeks, nose, and a handlebar mustache. */}
        <circle cx={50} cy={66} r={5} fill="#f07a6a" fillOpacity="0.35" />
        <circle cx={90} cy={66} r={5} fill="#f07a6a" fillOpacity="0.35" />
        {happy
          ? (
            <path
              d="M58 72Q70 88 82 72Z"
              fill="#7a1f16"
              {...line}
            />
          )
          : <path d="M61 75Q70 81 79 75" fill="none" {...line} />}
        <path
          d="M70 67C63 62 53 63 47 70C45 66 41 66 40 69C43 74 52 76 58 72C63 71 67 70 70 69C73 70 77 71 82 72C88 76 97 74 100 69C99 66 95 66 93 70C87 63 77 62 70 67Z"
          fill="#6b4226"
          {...line}
        />
        <ellipse cx={70} cy={63} rx={6.5} ry={5.5} fill="#f0a07a" {...line} />
        <circle cx={68} cy={61} r={1.6} fill="#fff" fillOpacity="0.8" />
      </g>
    </svg>
  );
}

/** A gold coin, for the purse. */
export function CoinIcon() {
  const id = useSvgId();
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="coin-icon">
      <defs>
        <radialGradient id={id} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff3a0" />
          <stop offset="1" stopColor="#e0a10c" />
        </radialGradient>
      </defs>
      <circle
        cx={12}
        cy={12}
        r={10}
        fill={`url(#${id})`}
        stroke={INK}
        strokeWidth="2"
      />
      <circle
        cx={12}
        cy={12}
        r={6.5}
        fill="none"
        stroke="#b77a06"
        strokeWidth="1.2"
      />
      <path
        d="M14.5 9.2C14 8.3 13 8 12 8C10.6 8 9.6 8.8 9.6 9.9C9.6 12.4 14.6 11.3 14.6 14C14.6 15.2 13.5 16 12 16C10.8 16 9.8 15.6 9.4 14.7M12 6.5V17.5"
        fill="none"
        stroke="#9a6304"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A gold nugget, for the title logo. */
export function NuggetIcon() {
  const id = useSvgId();
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="logo-art">
      <defs>
        <radialGradient id={id} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff6b8" />
          <stop offset="0.4" stopColor="#ffd23f" />
          <stop offset="0.85" stopColor="#e5a00d" />
          <stop offset="1" stopColor="#b8720a" />
        </radialGradient>
      </defs>
      <path
        d="M10 38C6 26 16 13 30 12C40 10 52 16 55 28C58 40 50 53 36 54C22 56 13 48 10 38Z"
        fill={`url(#${id})`}
        {...line}
        strokeWidth="3"
      />
      <path
        d="M26 30L33 26M38 40L44 34M22 44L28 42"
        stroke="#b97a0a"
        strokeOpacity="0.55"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <ellipse
        cx={22}
        cy={23}
        rx={7}
        ry={3.5}
        fill="#fff"
        fillOpacity="0.85"
        transform="rotate(-35 22 23)"
      />
      <Twinkle x={50} y={14} size={7} />
    </svg>
  );
}

/** A cut diamond, for the title logo. */
export function GemIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="logo-art">
      <path d="M20 14H44L32 26Z" fill="#e9fdff" />
      <path d="M20 14L32 26L8 26Z" fill="#b5f2fd" />
      <path d="M44 14L56 26H32Z" fill="#7fdcf3" />
      <path d="M8 26H32L32 56Z" fill="#56c6ea" />
      <path d="M32 26H56L32 56Z" fill="#2c9fd3" />
      <path
        d="M20 14H44L56 26L32 56L8 26Z"
        fill="none"
        {...line}
        strokeWidth="3"
      />
      <path
        d="M8 26H56M20 14L32 26L44 14M32 26V56"
        fill="none"
        stroke={INK}
        strokeWidth="1.2"
        strokeOpacity="0.5"
      />
      <Twinkle x={18} y={18} size={6} />
    </svg>
  );
}
