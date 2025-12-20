export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.error || errorData.message || 'An error occurred while fetching the data.';
    const error = new Error(errorMessage);
    // Add extra info to the error object.
    (error as any).info = errorData;
    (error as any).status = res.status;
    (error as any).message = errorMessage;
    throw error;
  }
  return res.json();
}
