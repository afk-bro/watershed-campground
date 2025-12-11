import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "The Watershed Campground",
        short_name: "Watershed",
        description: "Peaceful lakeside camping on Kootenay Lake",
        start_url: "/",
        display: "standalone",
        background_color: "#06251c",
        theme_color: "#06251c",
        icons: [
            {
                src: "/favicon.ico",
                sizes: "any",
                type: "image/x-icon",
            },
        ],
    };
}
