export type PaginationItem = number | 'ellipsis-left' | 'ellipsis-right';

export function getPaginationItems(
  currentPage: number,
  totalPages: number,
  siblingCount = 1,
): PaginationItem[] {
  if (totalPages <= 0) {
    return [];
  }

  const totalNumbers = siblingCount * 2 + 5;
  if (totalPages <= totalNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

  const boundaryCount = 1 + 2 * siblingCount;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftRange = Array.from({ length: boundaryCount }, (_, i) => i + 1);
    return [...leftRange, 'ellipsis-right', totalPages];
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightRange = Array.from(
      { length: boundaryCount },
      (_, i) => totalPages - boundaryCount + 1 + i,
    );
    return [1, 'ellipsis-left', ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i,
  );
  return [1, 'ellipsis-left', ...middleRange, 'ellipsis-right', totalPages];
}
