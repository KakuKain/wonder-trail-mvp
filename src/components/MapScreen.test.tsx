// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapScreen } from "./MapScreen";

const chapters = [{
  id: "forest",
  part: "A",
  className: "forest-node",
  playable: true,
  image: "forest.webp",
  position: { x: 50, y: 50, width: 20 },
  place: "森林",
  mechanic: "找東西",
  story: "到森林找零件。",
}];

describe("MapScreen reset confirmation", () => {
  it("does not clear progress until the destructive action is confirmed", () => {
    const onReset = vi.fn();
    render(<MapScreen
      chapters={chapters}
      hasProgress
      forestPartAcquired={false}
      marketPartAcquired={false}
      mapArt="map.webp"
      planeArt="plane.webp"
      characterArt="fox.webp"
      headline={<strong>零件島</strong>}
      body={<p>選一個地方開始。</p>}
      replayIcon={<span aria-hidden="true">↻</span>}
      lockIcon={<span aria-hidden="true">鎖</span>}
      onMapReady={() => undefined}
      onReset={onReset}
      onChapterSelect={() => undefined}
    />);

    fireEvent.click(screen.getByRole("button", { name: "重新開始遊戲" }));
    expect(screen.getByRole("dialog", { name: "要重新開始嗎？" })).toBeTruthy();
    expect(onReset).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "繼續遊玩" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onReset).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "重新開始遊戲" }));
    fireEvent.click(screen.getByRole("button", { name: "清除進度" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
