module.exports = {
  content: ["./public/*.html", "./public/admin/*.html", "./public/assets/js/*.js", "./public/admin/*.js"],
  theme: {
    extend: {
      colors: {
        ivory: "#FAFAF7",
        walnut: { DEFAULT: "#161616", soft: "#262624" },
        olive: "#7B7350",
        sand: "#E4E1D6",
        paper: "#F1F0EA",
        stone: "#5C5C58",
        terracotta: { DEFAULT: "#7B7350", deep: "#5C5636" }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter Tight", "Inter", "system-ui", "sans-serif"],
        accent: ['"Instrument Serif"', "Georgia", "serif"]
      },
      maxWidth: { site: "1360px" },
      keyframes: { marquee: { "0%": { transform: "translate(0)" }, "100%": { transform: "translate(-50%)" } } },
      animation: { marquee: "marquee 40s linear infinite" }
    }
  }
};
