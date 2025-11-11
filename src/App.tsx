import { useState, useEffect, useRef } from "react";
import Map, { Source, Layer, NavigationControl } from "react-map-gl/mapbox";
import { Scrollama, Step, type StepEnterEvent } from "react-scrollama";
import "mapbox-gl/dist/mapbox-gl.css";

type LayerDef = {
  id: string;
  name: string;
  url?: string;
  opacity?: number;
  description: string;
  view: { latitude: number; longitude: number; zoom: number };
};

const LAYERS: LayerDef[] = [
  {
    id: "intro-globe",
    name: "Full Earth View",
    description: "The story begins with the entire Earth — zoom in to explore specific phenomena.",
    view: { latitude: 0, longitude: 0, zoom: 2 },
  },
  {
    id: "total-methane",
    name: "Methane (EPA total)",
    url: "https://earth.gov/ghgcenter/api/raster/searches/92ef8a307eaf0dd5c1403e04b414b712/tiles/WebMercatorQuad/{z}/{x}/{y}?assets=total-methane&rescale=0,20&colormap_name=epa-ghgi-ch4",
    opacity: 0.7,
    description: "Global methane emissions from human and natural sources — focusing on the United States.",
    view: { latitude: 37.5, longitude: -95, zoom: 2.8 },
  },
  {
    id: "no2-monthly",
    name: "Nitrogen dioxide (NO₂)",
    url: "https://openveda.cloud/api/raster/searches/54f6090e54cf744b4db5b037be979254/tiles/WebMercatorQuad/{z}/{x}/{y}?assets=cog_default&bidx=1&colormap_name=rdbu_r&rescale=0%2C15000000000000000",
    opacity: 0.6,
    description: "Satellite-derived NO₂ showing air pollution hotspots — centered on New York.",
    view: { latitude: 40.7128, longitude: -74.006, zoom: 6.5 },
  },
  {
    id: "days-above-90f",
    name: "Days above 90°F (CMIP6 SSP245)",
    url: "https://openveda.cloud/api/raster/searches/05508f8b6bee59b2007bb1a338f64001/tiles/WebMercatorQuad/{z}/{x}/{y}?assets=tmax_above_90&colormap_name=wistia&rescale=0%2C365",
    opacity: 0.45,
    description: "Projected annual count of days exceeding 90°F under a mid-range scenario.",
    view: { latitude: 25, longitude: -100, zoom: 3.2 },
  },
  {
    id: "geoglam",
    name: "Crop conditions (GEOGLAM)",
    url: "https://openveda.cloud/api/raster/searches/b8b84be08e9be485e882321a29bcc36e/tiles/WebMercatorQuad/{z}/{x}/{y}?assets=cog_default&colormap=%7B%221%22%3A+%5B120%2C+120%2C+120%5D%2C+%222%22%3A+%5B130%2C+65%2C+0%5D%2C+%223%22%3A+%5B66%2C+207%2C+56%5D%2C+%224%22%3A+%5B245%2C+239%2C+0%5D%2C+%225%22%3A+%5B241%2C+89%2C+32%5D%2C+%226%22%3A+%5B168%2C+0%2C+0%5D%2C+%227%22%3A+%5B0%2C+143%2C+201%5D%7D&resampling=nearest",
    opacity: 0.5,
    description: "Global crop monitoring data showing strong and weak agricultural performance.",
    view: { latitude: 10, longitude: 30, zoom: 2 },
  },
  {
    id: "grdi-v1",
    name: "Global deprivation index (GRDI)",
    url: "https://openveda.cloud/api/raster/searches/2e402f857dd5363f04809920c76793b2/tiles/WebMercatorQuad/{z}/{x}/{y}?assets=cog_default&colormap_name=viridis",
    opacity: 0.4,
    description: "Mapping global deprivation — focusing on India’s socioeconomic diversity.",
    view: { latitude: 21, longitude: 78, zoom: 3.8 },
  },
  {
    id: "poi-showcase",
    name: "Global Points of Interest",
    description: "Cities rendered as glowing points with labels.",
    view: { latitude: 20, longitude: 0, zoom: 1.8 },
  },
  {
    id: "finale",
    name: "Back to the Globe",
    description: "Returning to a full-Earth perspective for free exploration.",
    view: { latitude: 0, longitude: 0, zoom: 1.3 },
  },
];

const POI_GEOJSON = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { name: "New York City" }, geometry: { type: "Point", coordinates: [-74.006, 40.7128] } },
    { type: "Feature", properties: { name: "Delhi" }, geometry: { type: "Point", coordinates: [77.209, 28.6139] } },
    { type: "Feature", properties: { name: "Cairo" }, geometry: { type: "Point", coordinates: [31.2357, 30.0444] } },
    { type: "Feature", properties: { name: "São Paulo" }, geometry: { type: "Point", coordinates: [-46.6339, -23.5505] } },
    { type: "Feature", properties: { name: "Tokyo" }, geometry: { type: "Point", coordinates: [139.6917, 35.6895] } },
  ],
};

export default function StoryMap() {
  const [activeLayer, setActiveLayer] = useState(LAYERS[0]);
  const [visibleId, setVisibleId] = useState<string | null>(null);
  const [freeMode, setFreeMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const mobile = /Mobi|Android/i.test(navigator.userAgent);
    setIsMobile(mobile);
    if (mobile) setFreeMode(true);
  }, []);

  const handleStepEnter = (e: StepEnterEvent<{ id: string }>) => {
    if (freeMode) return;
    const next = LAYERS.find((l) => l.id === e.data.id);
    if (next) {
      setActiveLayer(next);
      setVisibleId(e.data.id);
    }
  };

useEffect(() => {
  if (!mapLoaded) return;
  const map = mapRef.current;
  if (!map) return;

  if (activeLayer.id !== "intro-globe") {
    map.stop();
    return;
  }

  const secondsPerRevolution = 120;
  const maxSpinZoom = 5;
  const slowSpinZoom = 3;
  let userInteracting = false;
  const spinEnabled = true;

  function spinGlobe() {
    if (!spinEnabled || userInteracting) return;

    const zoom = map.getZoom();
    if (zoom >= maxSpinZoom) return;

    let distancePerSecond = 360 / secondsPerRevolution;
    if (zoom > slowSpinZoom) {
      const zoomFactor = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
      distancePerSecond *= Math.max(0, zoomFactor);
    }

    const center = map.getCenter();
    center.lng -= distancePerSecond;
    map.easeTo({
      center,
      duration: 1000,
      easing: (n) => n,
      essential: true,
    });
  }

  const pause = () => {
    userInteracting = true;
    map.stop();
  };
  const resume = () => {
    userInteracting = false;
    spinGlobe();
  };

  map.on("mousedown", pause);
  map.on("mouseup", resume);
  map.on("dragend", resume);
  map.on("pitchend", resume);
  map.on("rotateend", resume);
  map.on("moveend", spinGlobe);

  spinGlobe();

  return () => {
    map.off("mousedown", pause);
    map.off("mouseup", resume);
    map.off("dragend", resume);
    map.off("pitchend", resume);
    map.off("rotateend", resume);
    map.off("moveend", spinGlobe);
    map.stop();
  };
}, [mapLoaded, activeLayer.id]);



  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [activeLayer.view.longitude, activeLayer.view.latitude],
      zoom: activeLayer.view.zoom,
      pitch: 20,
      bearing: 0,
      speed: 0.6,
      curve: 1.4,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  }, [activeLayer]);

  const renderCountryMask = () => {
    if (freeMode) return null;
    if (!["total-methane", "grdi-v1"].includes(activeLayer.id)) return null;
    const code = activeLayer.id === "total-methane" ? "USA" : "IND";
    return (
      <Source id="country-mask" type="vector" url="mapbox://mapbox.country-boundaries-v1">
        <Layer
          id="world-fade"
          type="fill"
          source-layer="country_boundaries"
          paint={{
            "fill-color": [
              "case",
              ["==", ["get", "iso_3166_1_alpha_3"], code],
              "rgba(0,0,0,0)",
              "rgba(0,0,0,0.78)",
            ],
          }}
        />
        <Layer
          id="country-glow"
          type="line"
          source-layer="country_boundaries"
          filter={["==", ["get", "iso_3166_1_alpha_3"], code]}
          paint={{
            "line-color": "#ffcc66",
            "line-width": 3.5,
            "line-blur": 6,
            "line-opacity": 0.85,
          }}
        />
      </Source>
    );
  };

  const renderPOIs = () => {
    if (activeLayer.id !== "poi-showcase") return null;
    return (
      <Source id="pois" type="geojson" data={POI_GEOJSON}>
        <Layer
          id="poi-lines"
          type="line"
          paint={{
            "line-color": "#ffcc66",
            "line-width": 1.2,
            "line-blur": 1.5,
            "line-opacity": 0.8,
          }}
        />
        <Layer
          id="poi-points"
          type="circle"
          paint={{
            "circle-radius": 6,
            "circle-color": "#ffcc66",
            "circle-stroke-width": 1.2,
            "circle-stroke-color": "#fff",
            "circle-opacity": 0.9,
          }}
        />
        <Layer
          id="poi-labels"
          type="symbol"
          layout={{
            "text-field": ["get", "name"],
            "text-font": ["Open Sans Bold"],
            "text-size": 13,
            "text-anchor": "bottom",
            "text-offset": [0, -1.2],
          }}
          paint={{
            "text-color": "#000",
            "text-halo-color": "#ffcc66",
            "text-halo-width": 8,
            "text-halo-blur": 1,
          }}
        />
      </Source>
    );
  };


  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <Map
        ref={(ref) => (mapRef.current = ref?.getMap?.() ?? null)}
        onLoad={(e) => {
          mapRef.current = e.target;
          setMapLoaded(true);
        }}
        initialViewState={{
          latitude: activeLayer.view.latitude,
          longitude: activeLayer.view.longitude,
          zoom: activeLayer.view.zoom,
        }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
        projection={{ name: "globe" }}
        style={{ position: "fixed", inset: 0 }}
        // fog={{
        //   color: "rgba(245,210,150,0.4)",
        //   "high-color": "rgba(255,200,120,0.35)",
        //   "space-color": "rgba(15,10,5,1)",
        //   "horizon-blend": 0.25,
        // }}
        // light={{ anchor: "viewport", color: "#ffd799", intensity: 0.4 }}
        fog={{
          color: "rgba(240,210,160,0.35)",
          "high-color": "rgba(255,220,150,0.25)",
          "space-color": "#030310",
          "horizon-blend": 0.2,
        }}
        light={{ anchor: "viewport", color: "#fff2cc", intensity: 0.35 }}
      >
        <NavigationControl position="top-right" />

        {activeLayer.url && (
          <Source id="main-source" type="raster" tiles={[activeLayer.url]} tileSize={256}>
            <Layer id="main-layer" type="raster" paint={{ "raster-opacity": activeLayer.opacity ?? 0.6 }} />
          </Source>
        )}
        {renderCountryMask()}
        {renderPOIs()}
      </Map>

      {freeMode && !isMobile && (
        <button
          onClick={() => setFreeMode((v) => !v)}
          style={{
            position: "absolute",
            top: "9px",
            left: "10px",
            background: "rgba(20,20,20,0.8)",
            color: "#ffe6a3",
            border: "1px solid #ffcc66",
            padding: "0.4rem 0.9rem",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontWeight: 500,
            zIndex: 10,
            backdropFilter: "blur(4px)",
          }}
        >
          {freeMode ? "Story mode" : "Explore freely"}
        </button>
      )}

      {!freeMode && !isMobile && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "28vw",
            height: "100vh",
            overflowY: "scroll",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            background: "linear-gradient(to bottom, rgba(10,10,10,0.85), rgba(10,10,10,0.6))",
            backdropFilter: "blur(8px)",
            padding: "1.5rem",
            color: "#f1f1f1",
          }}
        >
          <h2 style={{ marginBottom: "2rem", color: "#ffe6a3", display: 'flex', justifyContent: 'space-between' }}>Start scrolling to explore
            {!isMobile && (
            <button
              onClick={() => setFreeMode((v) => !v)}
              style={{
                background: "rgba(20,20,20,0.8)",
                color: "#ffe6a3",
                border: "1px solid #ffcc66",
                padding: "0.4rem 0.9rem",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 500,
                zIndex: 10,
                backdropFilter: "blur(4px)",
              }}
            >
              {freeMode ? "Story mode" : "Explore freely"}
            </button>
            )}
          </h2>
          <Scrollama onStepEnter={handleStepEnter} offset={0.6}>
            {LAYERS.map((l) => (
              <Step data={{ id: l.id }} key={l.id}>
                <div
                  style={{
                    margin: "80vh 0",
                    padding: "1.2rem 0",
                    opacity: visibleId === l.id ? 1 : 0,
                    transform: visibleId === l.id ? "translateY(0)" : "translateY(10px)",
                    transition: "opacity 0.9s ease, transform 0.9s ease",
                  }}
                >
                  <h3 style={{ color: visibleId === l.id ? "#ffcc66" : "#ddd", fontSize: "1rem" }}>{l.name}</h3>
                  <p style={{ color: "#ccc", fontSize: "0.85rem" }}>{l.description}</p>
                </div>
              </Step>
            ))}
          </Scrollama>
        </div>
      )}

      {freeMode && (
        <div
          style={{
            position: "absolute",
            bottom: "1rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(20,20,20,0.8)",
            padding: "0.6rem 1rem",
            display: "flex",
            gap: "0.6rem",
            overflowX: "auto",
            border: "1px solid rgba(255,204,102,0.4)",
            zIndex: 10,
            backdropFilter: "blur(6px)",
            maxWidth: "90vw",
          }}
        >
          {LAYERS.map((l) => (
            <div
              key={l.id}
              onClick={() => setActiveLayer(l)}
              style={{
                cursor: "pointer",
                padding: "0.4rem 0.7rem",
                background:
                  activeLayer.id === l.id ? "rgba(255,204,102,0.25)" : "rgba(40,40,40,0.4)",
                border: activeLayer.id === l.id ? "1px solid #ffcc66" : "1px solid transparent",
                transition: "all 0.3s ease",
              }}
            >
              <span
                style={{
                  color: activeLayer.id === l.id ? "#ffcc66" : "#ccc",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {l.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
