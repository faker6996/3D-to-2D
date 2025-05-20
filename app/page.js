import DrawIntoImage from "./components/DrawIntoImg";
import PCDBoxTool from "./components/PCDBoxTool";
import PCDViewer from "./components/PCDViewer";

export default function Home() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold text-center mb-6">PCD Viewer</h1>
      <div className="grid grid-cols-12 gap-6">
        {/* Phần ảnh chiếm 4 cột */}
        <div className="col-span-4 grid grid-cols-1 gap-4">
          <DrawIntoImage></DrawIntoImage>
        </div>

        {/* Phần PCD Viewer chiếm 8 cột */}
        <div className="col-span-8">
          <PCDViewer />
        </div>
      </div>
    </main>
  );
}
