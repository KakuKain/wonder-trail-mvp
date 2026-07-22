import type { ReactNode } from "react";
import type { AssetDefinition } from "../../types";

type Props = {
  collectionPages: AssetDefinition[][];
  currentPage: number;
  renderObjectIcon: (assetId: string) => ReactNode;
  bookIcon: ReactNode;
  arrowIcon: ReactNode;
  onClose: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

export function CollectionBookModal({
  collectionPages,
  currentPage,
  renderObjectIcon,
  bookIcon,
  arrowIcon,
  onClose,
  onPreviousPage,
  onNextPage,
}: Props) {
  return (
    <div className="collection-modal-backdrop" role="dialog" aria-modal="true" aria-label="森林圖鑑">
      <div className="collection-book-modal">
        <div className="collection-book-cover-shadow" aria-hidden="true" />
        <button className="collection-close-button" type="button" aria-label="關閉圖鑑" onClick={onClose}>×</button>
        <div className="collection-book-title">{bookIcon}<span>森林圖鑑</span></div>
        <div className="collection-book-pages">
          {Array.from({ length: 4 }).map((_, index) => {
            const asset = collectionPages[currentPage][index];
            return (
              <div className={`collection-slot ${asset ? "collected" : "locked"}`} key={asset?.id ?? `empty-${index}`}>
                {asset ? (
                  <div className="collection-sticker-card">
                    <span className="collection-tape tape-left" aria-hidden="true" />
                    <span className="collection-tape tape-right" aria-hidden="true" />
                    {renderObjectIcon(asset.id)}
                    <span>{asset.label}</span>
                  </div>
                ) : (
                  <div className="collection-locked-card" aria-label="還沒發現"><span className="collection-empty-mark">?</span><small>未發現</small></div>
                )}
              </div>
            );
          })}
        </div>
        <div className="collection-page-controls">
          <button className="collection-page-button prev" type="button" aria-label="上一頁" disabled={currentPage === 0} onClick={onPreviousPage}>{arrowIcon}</button>
          <span className="collection-page-tab">{currentPage + 1}/{collectionPages.length}</span>
          <button className="collection-page-button" type="button" aria-label="下一頁" disabled={currentPage >= collectionPages.length - 1} onClick={onNextPage}>{arrowIcon}</button>
        </div>
      </div>
    </div>
  );
}
