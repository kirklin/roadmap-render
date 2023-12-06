export interface Wireframe {
  mockup: {
    measuredW: string; // 界面的测量宽度
    measuredH: string; // 界面的测量高度
    mockupW: string; // 界面的宽度
    mockupH: string; // 界面的高度
    controls: {
      control: Control[]; // 控件数组
    };
    // 其他属性...
    [key: string]: any;
  };
  attributes: {
    name: string; // 名称
    order: number; // 排序顺序
    parentID: string | null; // 父级ID（可能为 null）
    notes: string; // 备注
    // 其他属性...
    [key: string]: any;
  };
  branchID: string; // 分支ID
  resourceID: string; // 资源ID
  version: string; // 版本号
  groupOffset: {
    x: number | string; // 组偏移的X坐标
    y: number | string; // 组偏移的Y坐标
  };
  dependencies: any[]; // 依赖项（可能为空数组）
  projectID: string; // 项目ID
  // 其他属性...
  [key: string]: any;
}
export interface Control {
  ID: string; // 控件的唯一标识符
  typeID: string; // 控件类型的标识
  zOrder: string; // 控件的层级顺序
  measuredW: string; // 控件的测量宽度
  measuredH: string; // 控件的测量高度
  w: string; // 控件的宽度
  h: string; // 控件的高度
  x: string; // 控件的 X 坐标
  y: string; // 控件的 Y 坐标
  properties: {
    controlName?: string; // 控件名称（可能存在，可能为空）
    size?: string; // 控件的文字大小（可能存在，可能为空）
    text?: string; // 控件的文字内容（可能存在，可能为空）
    // 其他属性...
    [key: string]: any;
  };
  children?: {
    controls: {
      control: Control[]; // 子控件数组
    };
    // 其他属性...
    [key: string]: any;
  };
}
