import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";

export function useCollection(queryRef, dependencies = []) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(Boolean(queryRef));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!queryRef) {
      setDocuments([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError("");
    return onSnapshot(
      queryRef,
      (snapshot) => {
        setDocuments(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      },
    );
  }, dependencies);

  return { documents, loading, error };
}
