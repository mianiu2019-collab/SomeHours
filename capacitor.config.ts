import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mianiu.somehours",
  appName: "Some Hours",
  webDir: "out",
  plugins: {
    SystemBars: {
      insetsHandling: "css",
    },
  },
};

export default config;
