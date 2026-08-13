import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mianiu.somehours",
  appName: "SomeHours",
  webDir: "out",
  plugins: {
    SystemBars: {
      insetsHandling: "css",
    },
  },
};

export default config;
