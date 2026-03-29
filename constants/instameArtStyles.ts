import type { ImageSourcePropType } from "react-native";

export type InstaMeArtStyle = {
  id: string;
  label: string;
  subtitle: string;
  promptHint: string;
  preview: ImageSourcePropType;
};

export const INSTAME_WELCOME_CARD_SOURCES: ImageSourcePropType[] = [
  require("../assets/images/welcome-cards/welcome-card-1.png"),
  require("../assets/images/welcome-cards/welcome-card-2.png"),
  require("../assets/images/welcome-cards/welcome-card-3.png"),
  require("../assets/images/welcome-cards/welcome-card-4.png"),
];

export const INSTAME_ART_STYLES: InstaMeArtStyle[] = [
  {
    id: "colored_hand_drawn_sketch",
    label: "Colored Hand-Drawn Sketch",
    subtitle: "Soft illustrative lines with gentle color",
    promptHint:
      "render the portrait as a colored hand-drawn sketch with visible pencil texture, delicate outlines, and softly layered colors",
    preview: require("../assets/images/art-styles/colored-hand-drawn-sketch.png"),
  },
  {
    id: "black_and_white_sketch",
    label: "Black-and-White Sketch",
    subtitle: "Graphic monochrome line work",
    promptHint:
      "render the portrait as a refined black-and-white hand-drawn sketch with clean shading, pencil strokes, and elegant monochrome contrast",
    preview: require("../assets/images/art-styles/black-and-white-sketch.png"),
  },
  {
    id: "simple_watercolor",
    label: "Simple Watercolor",
    subtitle: "Airy paint wash with soft edges",
    promptHint:
      "render the portrait as a simple watercolor painting with soft brush blooms, light pigment texture, and a clean artistic finish",
    preview: require("../assets/images/art-styles/simple-watercolor.png"),
  },
];
