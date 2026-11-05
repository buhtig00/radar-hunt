import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RhShell } from "@/components/radar-hunt/rh-shell";

export const Route = createFileRoute("/radar-hunt")({
  head: () => ({
    meta: [
      { title: "Radar Hunt · Play. Learn. Discover." },
      {
        name: "description",
        content:
          "Ligas internacionales de oftalmología, retos BOSS y el Eye Universe interactivo en 3D.",
      },
      { name: "theme-color", content: "#0b1220" },
    ],
  }),
  component: RadarHuntLayout,
});

function RadarHuntLayout() {
  return (
    <RhShell>
      <Outlet />
    </RhShell>
  );
}
