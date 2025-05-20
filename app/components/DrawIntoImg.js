"use client";
// <reference types="three" />
// <reference types="three/examples" />
// Summary of the code: This code is a React component that draws a 3D cuboid on a 2D image using calibration data.
// It generates the cuboid's corners, applies rotation and translation, performs perspective projection, applies distortion correction,
// and finally draws the cuboid on the image. The resulting image is displayed in the component.
// Thế giới(World coordinate system) (3D) → [Rotation + Translation] → Hệ tọa độ camera(Camera coordinate system) → [Projection] → Ảnh(image) 2D
// The code uses the HTML canvas to draw the cuboid and saves the drawn image in local storage for later retrieval.

import { useEffect, useState } from "react";

export default function DrawIntoImage() {
  const [drawnImage, setDrawnImage] = useState(null);

  function convert3DTo2D(center, l, w, h, calibrationData, imageSrc) {
    // 1. Generate 8 corners from center and dimensions.
    const generateCorners = (center, length, width, height) => {
      const [x_c, y_c, z_c] = center;
      const halfLength = length / 2;
      const halfWidth = width / 2;
      const halfHeight = height / 2;
      return [
        [x_c - halfWidth, y_c - halfLength, z_c - halfHeight], // 0: Front-Bottom-Left
        [x_c + halfWidth, y_c - halfLength, z_c - halfHeight], // 1: Front-Bottom-Right
        [x_c - halfWidth, y_c + halfLength, z_c - halfHeight], // 2: Front-Top-Left
        [x_c + halfWidth, y_c + halfLength, z_c - halfHeight], // 3: Front-Top-Right
        [x_c - halfWidth, y_c - halfLength, z_c + halfHeight], // 4: Back-Bottom-Left
        [x_c + halfWidth, y_c - halfLength, z_c + halfHeight], // 5: Back-Bottom-Right
        [x_c - halfWidth, y_c + halfLength, z_c + halfHeight], // 6: Back-Top-Left
        [x_c + halfWidth, y_c + halfLength, z_c + halfHeight], // 7: Back-Top-Right
      ];
    };

    const corners = generateCorners(center, l, w, h);

    // 2. Apply rotation using the 3x3 rotation matrix from calibration.
    const rotationMatrix = [
      [calibrationData.Rotation[0], calibrationData.Rotation[1], calibrationData.Rotation[2]],
      [calibrationData.Rotation[3], calibrationData.Rotation[4], calibrationData.Rotation[5]],
      [calibrationData.Rotation[6], calibrationData.Rotation[7], calibrationData.Rotation[8]],
    ];

    // nhân ma trận xoay với tọa độ của các đỉnh
    const rotatedCorners = corners.map((corner) => {
      return [
        rotationMatrix[0][0] * corner[0] + rotationMatrix[0][1] * corner[1] + rotationMatrix[0][2] * corner[2],
        rotationMatrix[1][0] * corner[0] + rotationMatrix[1][1] * corner[1] + rotationMatrix[1][2] * corner[2],
        rotationMatrix[2][0] * corner[0] + rotationMatrix[2][1] * corner[1] + rotationMatrix[2][2] * corner[2],
      ];
    });

    // 3. Apply translation: adjust each coordinate using Translation vector.
    const translatedCorners = rotatedCorners.map((corner) => {
      return [corner[0] + calibrationData.Translation[0], corner[1] + calibrationData.Translation[1], corner[2] + calibrationData.Translation[2]];
    });

    // 4. Perspective projection: compute normalized image coordinates.
    const projectedCorners = translatedCorners.map((corner) => {
      const [X, Y, Z] = corner;
      const xu = X / Z;
      const yu = Y / Z;
      return { xu, yu, depth: Z };
    });

    // 5. Apply distortion correction.
    const distortedCorners = projectedCorners.map(({ xu, yu, depth }) => {
      const r2 = xu ** 2 + yu ** 2;
      const r = Math.sqrt(r2);
      const theta = Math.atan(r);
      // Sử dụng các hệ số distortion từ calibrationData.Distortion.
      const distortionCoeffs = calibrationData.Distortion;
      const k =
        (theta *
          (distortionCoeffs[0] +
            distortionCoeffs[1] * theta ** 2 +
            distortionCoeffs[2] * theta ** 4 +
            distortionCoeffs[3] * theta ** 6 +
            distortionCoeffs[4] * theta ** 8)) /
        r;
      return { xd: k * xu, yd: k * yu, depth };
    });

    // 6. Convert to final pixel coordinates using the Intrinsic matrix.
    const finalPixelCoords = distortedCorners.map(({ xd, yd, depth }) => {
      const fx = calibrationData.Intrinsic[0];
      const skew = calibrationData.Intrinsic[1];
      const cx = calibrationData.Intrinsic[2];
      const fy = calibrationData.Intrinsic[4];
      const cy = calibrationData.Intrinsic[5];
      return {
        x: fx * xd + skew * yd + cx,
        y: fy * yd + cy,
        distance: depth,
      };
    });

    // 7. Draw the cuboid using edge definitions.
    // Định nghĩa các cạnh của cuboid: nối mặt trước, mặt sau và các cạnh kết nối.
    const edges = [
      [0, 1],
      [1, 3],
      [3, 2],
      [2, 0], // Front face
      [4, 5],
      [5, 7],
      [7, 6],
      [6, 4], // Back face
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7], // Connecting edges
    ];

    // 8. Tạo canvas và vẽ ảnh cùng các cạnh.
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      ctx.strokeStyle = "red";
      ctx.lineWidth = 4;
      edges.forEach(([i, j]) => {
        const pt1 = finalPixelCoords[i];
        const pt2 = finalPixelCoords[j];
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.stroke();
      });

      const dataURL = canvas.toDataURL("image/png");
      localStorage.setItem("drawnImage", dataURL);
      setDrawnImage(dataURL);
    };
  }

  useEffect(() => {
    // Định nghĩa calibration: sử dụng hoặc import từ calibration.js
    const calib = {
      TYPE: "CAL_TYPE_HD_04_NEW",
      CAMERA: "FR_SD_CMR_RH",
      // Ma trận nội tại: fx, skew, cx, (0), fy, cy, ...
      Intrinsic: [988.16957, -1.179382, 1025.169915, 0.0, 978.203612, 635.074408, 0.0, 0.0, 1.0],
      // Hệ số distortion: [k0, k1, k2, k3, k4]
      Distortion: [1, 0.026121, -0.100987, 0.094122, -0.029356],
      // Ma trận xoay dạng mảng 9 phần tử
      Rotation: [-0.505164, 0.861079, -0.05789, 0.173734, 0.03576, -0.984142, -0.845355, -0.507212, -0.167663],
      // Vector dịch chuyển
      Translation: [-0.97772, -0.208895, -0.272932],
    };

    // Tọa độ tâm của xe (điểm trung tâm)
    const center = [-7.535623073577881, -2.3621749877929688, -0.8171270042657852];

    // Kích thước (chiều dài, chiều rộng, chiều cao): đảm bảo thuật ngữ hợp lý với generateCorners()
    const h = 1.9; // cao
    const w = 2.27; // rộng
    const l = 5.48; // dài

    // URL hoặc đường dẫn đến ảnh nền (frame)
    const imageSrc = "CMR_GT_Frame.jpg"; // Thay bằng URL thực tế

    convert3DTo2D(center, l, w, h, calib, imageSrc);

    // Nếu đã lưu ảnh từ lần trước, hiển thị nó
    const savedImage = localStorage.getItem("drawnImage");
    if (savedImage) setDrawnImage(savedImage);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      {drawnImage ? (
        <img src={drawnImage} alt="Đã vẽ khối 3D" className="w-full h-auto rounded-md" style={{ maxHeight: "500px" }} />
      ) : (
        <p>Đang xử lý hình...</p>
      )}
    </div>
  );
}
