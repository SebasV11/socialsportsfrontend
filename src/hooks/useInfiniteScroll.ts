'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface FetchResult<T> {
  data: T[];
  hasMore: boolean;
}

export interface InfiniteScrollState<T> {
  items: T[];
  loading: boolean;
  initialLoading: boolean;
  hasMore: boolean;
  error: string;
  sentinelRef: (node: HTMLElement | null) => void;
  reload: () => void;
}

/**
 * Generieke infinite-scroll hook. `fetchPage` haalt één pagina op
 * (1-based) en geeft `{ data, hasMore }` terug. Wanneer `resetKey`
 * verandert (filters) wordt de lijst gereset en vanaf pagina 1 herladen.
 */
export function useInfiniteScroll<T>(
  fetchPage: (page: number) => Promise<FetchResult<T>>,
  resetKey: string
): InfiniteScrollState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  const pageRef = useRef(0);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const requestIdRef = useRef(0);

  const loadNext = useCallback(async (replace: boolean) => {
    if (loadingRef.current) return;
    if (!replace && !hasMoreRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError('');

    const nextPage = replace ? 1 : pageRef.current + 1;
    const reqId = ++requestIdRef.current;

    try {
      const { data, hasMore: more } = await fetchRef.current(nextPage);
      if (reqId !== requestIdRef.current) return; // verouderd: filters gewijzigd
      pageRef.current = nextPage;
      hasMoreRef.current = more;
      setHasMore(more);
      setItems((current) => (replace ? data : [...current, ...data]));
    } catch {
      if (reqId === requestIdRef.current) setError('Laden is mislukt.');
    } finally {
      if (reqId === requestIdRef.current) {
        loadingRef.current = false;
        setLoading(false);
        if (replace) setInitialLoading(false);
      }
    }
  }, []);

  // Reset + eerste pagina laden bij filterwijziging.
  useEffect(() => {
    pageRef.current = 0;
    hasMoreRef.current = true;
    loadingRef.current = false;
    setItems([]);
    setHasMore(true);
    setInitialLoading(true);
    void loadNext(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (node) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            if (entries[0]?.isIntersecting) {
              void loadNext(false);
            }
          },
          { rootMargin: '200px' }
        );
        observerRef.current.observe(node);
      }
    },
    [loadNext]
  );

  return {
    items,
    loading,
    initialLoading,
    hasMore,
    error,
    sentinelRef,
    reload: () => void loadNext(true),
  };
}
