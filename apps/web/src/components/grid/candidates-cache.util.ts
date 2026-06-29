import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { CandidateDto, CandidateListQuery, CandidateListResponse } from "@taga-crm/shared";

/** Prefix dùng chung cho mọi query list candidates (mỗi filter/sort/search/group khác nhau là 1 query key riêng). */
export const CANDIDATES_QUERY_PREFIX = ["candidates", "list"] as const;

export function buildCandidatesQueryKey(params: CandidateListQuery) {
  return [
    ...CANDIDATES_QUERY_PREFIX,
    {
      search: params.search ?? "",
      filters: params.filters ?? [],
      sorts: params.sorts ?? [],
      groupBy: params.groupBy ?? null,
    },
  ] as const;
}

type CandidatesInfiniteData = InfiniteData<CandidateListResponse>;

/** Sửa 1 candidate trong MỌI query list đang cache (filter/view khác nhau vẫn cần đồng bộ). */
export function patchCandidateInCache(queryClient: QueryClient, updated: CandidateDto) {
  queryClient.setQueriesData<CandidatesInfiniteData>(
    { queryKey: CANDIDATES_QUERY_PREFIX },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.map((item) => (item.id === updated.id ? updated : item)),
        })),
      };
    },
  );
}

export function removeCandidatesFromCache(queryClient: QueryClient, ids: string[]) {
  const idSet = new Set(ids);
  queryClient.setQueriesData<CandidatesInfiniteData>(
    { queryKey: CANDIDATES_QUERY_PREFIX },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.filter((item) => !idSet.has(item.id)),
        })),
      };
    },
  );
}

/**
 * Prepend vào đúng query key đang active (view hiện tại) rồi invalidate phần còn lại —
 * bản ghi mới có khớp filter của các view khác hay không không suy luận được ở client.
 */
export function prependCandidateInCache(
  queryClient: QueryClient,
  created: CandidateDto,
  activeQueryKey: readonly unknown[],
) {
  queryClient.setQueryData<CandidatesInfiniteData>(activeQueryKey, (old) => {
    if (!old || old.pages.length === 0) return old;
    const [firstPage, ...rest] = old.pages;
    return {
      ...old,
      pages: [{ ...firstPage, items: [created, ...firstPage.items] }, ...rest],
    };
  });
  void queryClient.invalidateQueries({ queryKey: CANDIDATES_QUERY_PREFIX, exact: false });
}
