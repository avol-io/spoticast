import { useNavigation } from 'react-router-dom';

/** Thin bar at the top while a lazy page is being loaded. */
export function NavigationProgress() {
  const navigation = useNavigation();
  if (navigation.state === 'idle') return null;
  return (
    <div
      role="progressbar"
      aria-busy="true"
      className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden"
    >
      <div className="h-full w-1/3 animate-[progress_1s_ease-in-out_infinite] bg-brand" />
    </div>
  );
}

export default NavigationProgress;
