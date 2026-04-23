"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [materials, setMaterials] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [name, setName] = useState("");
  const [formula, setFormula] = useState("");
  const [specification, setSpecification] = useState("");
  const [stockCurrent, setStockCurrent] = useState("");
  const [unit, setUnit] = useState("g");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [outQuantity, setOutQuantity] = useState("");
  const [personName, setPersonName] = useState("");
  const [outNote, setOutNote] = useState("");

  const [selectedInMaterialId, setSelectedInMaterialId] = useState("");
  const [inQuantity, setInQuantity] = useState("");
  const [inPersonName, setInPersonName] = useState("");
  const [inNote, setInNote] = useState("");

  useEffect(() => {
    fetchMaterials();
    fetchTransactions();
  }, []);

  async function fetchMaterials() {
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("读取 materials 失败：", error);
      return;
    }

    setMaterials(data || []);
  }

  async function fetchTransactions() {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("读取 transactions 失败：", error);
      return;
    }

    setTransactions(data || []);
  }

  function getMaterialName(materialId) {
    const material = materials.find((item) => item.id === materialId);
    return material ? material.name : `材料ID ${materialId}`;
  }

  function formatTime(timeString) {
    if (!timeString) return "";
    const date = new Date(timeString);
    return date.toLocaleString("zh-CN", { hour12: false });
  }

  async function handleAddMaterial(e) {
    e.preventDefault();

    if (!name || !formula || !stockCurrent || !unit || !location) {
      alert("请把必填项填完整");
      return;
    }

    const { error } = await supabase.from("materials").insert([
      {
        name,
        formula,
        specification,
        vendor: "",
        batch_no: "",
        stock_current: Number(stockCurrent),
        unit,
        location,
        note,
        image_url: imageUrl,
      },
    ]);

    if (error) {
      console.error("新增材料失败：", error);
      alert("新增失败，请看控制台报错");
      return;
    }

    alert("新增成功");

    setName("");
    setFormula("");
    setSpecification("");
    setStockCurrent("");
    setUnit("g");
    setLocation("");
    setNote("");
    setImageUrl("");

    fetchMaterials();
  }

  async function handleStockOut(e) {
    e.preventDefault();

    if (!selectedMaterialId || !outQuantity || !personName) {
      alert("请把出库信息填完整");
      return;
    }

    const material = materials.find(
      (item) => item.id === Number(selectedMaterialId)
    );

    if (!material) {
      alert("没找到对应材料");
      return;
    }

    const quantityNumber = Number(outQuantity);

    if (quantityNumber <= 0) {
      alert("出库数量必须大于 0");
      return;
    }

    if (quantityNumber > Number(material.stock_current)) {
      alert("出库数量不能大于当前库存");
      return;
    }

    const newStock = Number(material.stock_current) - quantityNumber;

    const { error: updateError } = await supabase
      .from("materials")
      .update({ stock_current: newStock })
      .eq("id", material.id);

    if (updateError) {
      console.error("扣减库存失败：", updateError);
      alert("扣减库存失败");
      return;
    }

    const { error: transactionError } = await supabase
      .from("transactions")
      .insert([
        {
          material_id: material.id,
          type: "out",
          quantity: quantityNumber,
          unit: material.unit,
          person_name: personName,
          note: outNote,
        },
      ]);

    if (transactionError) {
      console.error("写入出库记录失败：", transactionError);
      alert("出库记录写入失败");
      return;
    }

    alert("出库成功");

    setSelectedMaterialId("");
    setOutQuantity("");
    setPersonName("");
    setOutNote("");

    fetchMaterials();
    fetchTransactions();
  }

  async function handleStockIn(e) {
    e.preventDefault();

    if (!selectedInMaterialId || !inQuantity || !inPersonName) {
      alert("请把入库信息填完整");
      return;
    }

    const material = materials.find(
      (item) => item.id === Number(selectedInMaterialId)
    );

    if (!material) {
      alert("没找到对应材料");
      return;
    }

    const quantityNumber = Number(inQuantity);

    if (quantityNumber <= 0) {
      alert("入库数量必须大于 0");
      return;
    }

    const newStock = Number(material.stock_current) + quantityNumber;

    const { error: updateError } = await supabase
      .from("materials")
      .update({ stock_current: newStock })
      .eq("id", material.id);

    if (updateError) {
      console.error("增加库存失败：", updateError);
      alert("增加库存失败");
      return;
    }

    const { error: transactionError } = await supabase
      .from("transactions")
      .insert([
        {
          material_id: material.id,
          type: "in",
          quantity: quantityNumber,
          unit: material.unit,
          person_name: inPersonName,
          note: inNote,
        },
      ]);

    if (transactionError) {
      console.error("写入入库记录失败：", transactionError);
      alert("入库记录写入失败");
      return;
    }

    alert("入库成功");

    setSelectedInMaterialId("");
    setInQuantity("");
    setInPersonName("");
    setInNote("");

    fetchMaterials();
    fetchTransactions();
  }

  async function handleDeleteMaterial(id, materialName) {
    const ok = window.confirm(`确定要删除「${materialName}」吗？这会同时删除它的出入库记录。`);

    if (!ok) return;

    const { error: transactionDeleteError } = await supabase
      .from("transactions")
      .delete()
      .eq("material_id", id);

    if (transactionDeleteError) {
      console.error("删除关联记录失败：", transactionDeleteError);
      alert("删除关联记录失败");
      return;
    }

    const { error: materialDeleteError } = await supabase
      .from("materials")
      .delete()
      .eq("id", id);

    if (materialDeleteError) {
      console.error("删除材料失败：", materialDeleteError);
      alert("删除材料失败");
      return;
    }

    alert("删除成功");
    fetchMaterials();
    fetchTransactions();
  }

  const visibleMaterials = materials.filter(
    (item) => Number(item.stock_current) > 0
  );

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">
          实验室材料记录系统
        </h1>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">显示中的材料数</p>
            <p className="mt-2 text-2xl font-bold">{visibleMaterials.length}</p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">总材料数（含 0 库存）</p>
            <p className="mt-2 text-2xl font-bold">{materials.length}</p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">总出入库记录数</p>
            <p className="mt-2 text-2xl font-bold">{transactions.length}</p>
          </div>
        </div>

        <div className="mb-8 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">新增材料</h2>

          <form
            onSubmit={handleAddMaterial}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div>
              <label className="mb-1 block text-sm text-gray-600">材料名称 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="例如：氧化镁"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">化学式 *</label>
              <input
                type="text"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="例如：MgO"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">纯度/规格</label>
              <input
                type="text"
                value={specification}
                onChange={(e) => setSpecification(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="例如：99.9%"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">当前库存 *</label>
              <input
                type="number"
                value={stockCurrent}
                onChange={(e) => setStockCurrent(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="例如：100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">单位 *</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="例如：g"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">位置 *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="例如：柜子2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-gray-600">备注</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="例如：500 nm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-gray-600">图片链接</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="粘贴图片 public URL"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                新增材料
              </button>
            </div>
          </form>
        </div>

        <div className="mb-8 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">材料出库</h2>

          <form
            onSubmit={handleStockOut}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div>
              <label className="mb-1 block text-sm text-gray-600">选择材料 *</label>
              <select
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
                className="w-full rounded border px-3 py-2"
              >
                <option value="">请选择材料</option>
                {visibleMaterials.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}（当前 {item.stock_current}{item.unit}）
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">出库数量 *</label>
              <input
                type="number"
                value={outQuantity}
                onChange={(e) => setOutQuantity(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="例如：20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">领用人 *</label>
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="例如：张三"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">备注</label>
              <input
                type="text"
                value={outNote}
                onChange={(e) => setOutNote(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="例如：LST 配料实验"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                提交出库
              </button>
            </div>
          </form>
        </div>

        <div className="mb-8 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">材料入库</h2>

          <form
            onSubmit={handleStockIn}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div>
              <label className="mb-1 block text-sm text-gray-600">选择材料 *</label>
              <select
                value={selectedInMaterialId}
                onChange={(e) => setSelectedInMaterialId(e.target.value)}
                className="w-full rounded border px-3 py-2"
              >
                <option value="">请选择材料</option>
                {materials.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}（当前 {item.stock_current}{item.unit}）
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">入库数量 *</label>
              <input
                type="number"
                value={inQuantity}
                onChange={(e) => setInQuantity(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="例如：50"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">操作人 *</label>
              <input
                type="text"
                value={inPersonName}
                onChange={(e) => setInPersonName(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="例如：李四"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">备注</label>
              <input
                type="text"
                value={inNote}
                onChange={(e) => setInNote(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="例如：新采购到货"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
              >
                提交入库
              </button>
            </div>
          </form>
        </div>

        <div className="mb-8 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">当前库存（0 g 不显示）</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-4 py-2 text-left">图片</th>
                  <th className="border px-4 py-2 text-left">材料名称</th>
                  <th className="border px-4 py-2 text-left">化学式</th>
                  <th className="border px-4 py-2 text-left">规格</th>
                  <th className="border px-4 py-2 text-left">当前库存</th>
                  <th className="border px-4 py-2 text-left">单位</th>
                  <th className="border px-4 py-2 text-left">位置</th>
                  <th className="border px-4 py-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {visibleMaterials.map((item) => (
                  <tr key={item.id}>
                    <td className="border px-4 py-2">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-16 w-16 rounded object-cover"
                        />
                      ) : (
                        <span className="text-sm text-gray-400">暂无图片</span>
                      )}
                    </td>
                    <td className="border px-4 py-2">{item.name}</td>
                    <td className="border px-4 py-2">{item.formula}</td>
                    <td className="border px-4 py-2">{item.specification}</td>
                    <td className="border px-4 py-2">{item.stock_current}</td>
                    <td className="border px-4 py-2">{item.unit}</td>
                    <td className="border px-4 py-2">{item.location}</td>
                    <td className="border px-4 py-2">
                      <button
                        onClick={() => handleDeleteMaterial(item.id, item.name)}
                        className="rounded bg-gray-800 px-3 py-1 text-sm text-white hover:bg-black"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {visibleMaterials.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                目前没有可显示的库存材料
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">出入库记录</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-4 py-2 text-left">时间</th>
                  <th className="border px-4 py-2 text-left">材料名称</th>
                  <th className="border px-4 py-2 text-left">类型</th>
                  <th className="border px-4 py-2 text-left">数量</th>
                  <th className="border px-4 py-2 text-left">单位</th>
                  <th className="border px-4 py-2 text-left">人员</th>
                  <th className="border px-4 py-2 text-left">备注</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((item) => (
                  <tr key={item.id}>
                    <td className="border px-4 py-2">{formatTime(item.created_at)}</td>
                    <td className="border px-4 py-2">{getMaterialName(item.material_id)}</td>
                    <td className="border px-4 py-2">
                      {item.type === "in" ? (
                        <span className="font-medium text-green-600">入库</span>
                      ) : item.type === "out" ? (
                        <span className="font-medium text-red-600">出库</span>
                      ) : (
                        item.type
                      )}
                    </td>
                    <td className="border px-4 py-2">{item.quantity}</td>
                    <td className="border px-4 py-2">{item.unit}</td>
                    <td className="border px-4 py-2">{item.person_name}</td>
                    <td className="border px-4 py-2">{item.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {transactions.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                目前还没有出入库记录
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}