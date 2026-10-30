import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Dojo from "./pages/Dojo";
import Watchtower from "./pages/Watchtower";
import Scroll from "./pages/Scroll";
import Lens from "./pages/Lens";
import Guide from "./pages/Guide";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/dojo" element={<Dojo />} />
          <Route path="/watchtower" element={<Watchtower />} />
          <Route path="/scroll" element={<Scroll />} />
          <Route path="/lens" element={<Lens />} />
          <Route path="/guide" element={<Guide />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
