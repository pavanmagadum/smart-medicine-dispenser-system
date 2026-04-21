import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { firestore } from "../services/firebase";

function normalizeSortTime(value) {
  if (!value) {
    return 0;
  }

  if (typeof value?.toDate === "function") {
    return value.toDate().getTime();
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default function useRealtimeCollection({ collectionName, userId, sortBy = "createdAt" }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const ref = collection(firestore, collectionName);
    const orderedQuery = query(ref, where("userId", "==", userId), orderBy(sortBy, "desc"));
    const fallbackQuery = query(ref, where("userId", "==", userId));

    let activeUnsubscribe = () => {};

    const subscribe = (targetQuery, shouldSortClientSide = false) => {
      activeUnsubscribe = onSnapshot(
        targetQuery,
        (snapshot) => {
          const mapped = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          const sorted = shouldSortClientSide
            ? mapped.sort((a, b) => normalizeSortTime(b[sortBy]) - normalizeSortTime(a[sortBy]))
            : mapped;
          setItems(sorted);
          setLoading(false);
          setError("");
        },
        (err) => {
          if (!shouldSortClientSide) {
            activeUnsubscribe();
            subscribe(fallbackQuery, true);
            return;
          }

          setError(err.message);
          setLoading(false);
        }
      );
    };

    subscribe(orderedQuery, false);

    return () => activeUnsubscribe();
  }, [collectionName, userId, sortBy]);

  return { items, loading, error };
}
