import { DEFAULT_COLORS } from "./constants";
import type { Control, Wireframe } from "./types";

/**
 * Convert a decimal color value to its RGB representation.
 * @param color - The decimal color value.
 * @returns The RGB representation of the color.
 */
function decimalToRGB(color: number): string {
  const red = (color >> 16) & 255; // Extracting red channel
  const green = (color >> 8) & 255; // Extracting green channel
  const blue = color & 255; // Extracting blue channel
  return `rgb(${red},${green},${blue})`; // Returning RGB representation
}

// 创建 SVG 元素的辅助函数
function createSVGElement(tag: string, attributes: Record<string, any> = {}, parent?: SVGElement | HTMLElement): SVGElement {
  const element: SVGElement = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const attr in attributes) {
    if (Object.prototype.hasOwnProperty.call(attributes, attr)) {
      element.setAttribute(attr, attributes[attr]);
    }
  }
  if (parent) {
    parent.appendChild(element);
  }
  return element;
}

const BORDER_WIDTH = 2.7;
const ARROW_WIDTH = 4;
const RECT_RADIUS = 10;

class Renderer {
  private svgRoot: SVGElement;
  private readonly fontFamily: string;
  private canvasRenderingContext2D: CanvasRenderingContext2D;

  constructor(svgRoot: SVGElement, fontFamily: string) {
    this.svgRoot = svgRoot;
    this.fontFamily = fontFamily;
    this.canvasRenderingContext2D = document.createElement("canvas").getContext("2d")!;
  }

  render(control: Control, container: any) {
    const type = control.typeID;
    if (type in this) {
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-expect-error
      this[type](control, container);
    } else {
      console.error(`'${type}' control type not implemented`);
    }
  }

  parseColor(color: any, defaultColor: any): string {
    return color === undefined ? `rgb(${defaultColor})` : decimalToRGB(color);
  }

  parseFontProperties(control: Control) {
    const { properties } = control;
    const style = properties && properties.italic ? "italic" : "normal";
    const weight = properties && properties.bold ? "bold" : "normal";
    const size = properties && properties.size ? `${properties.size}px` : "13px";
    const family = this.fontFamily;

    return { style, weight, size, family };
  }

  measureText(text: string, font: string): TextMetrics {
    this.canvasRenderingContext2D.font = font;
    return this.canvasRenderingContext2D.measureText(text);
  }

  drawRectangle(control: Control, container: HTMLElement | undefined): void {
    const { x, y, w, measuredW, h, measuredH, properties } = control;
    const rectX = Number.parseInt(x) + BORDER_WIDTH / 2;
    const rectY = Number.parseInt(y) + BORDER_WIDTH / 2;
    const rectWidth = Number.parseInt(w ?? measuredW) - BORDER_WIDTH;
    const rectHeight = Number.parseInt(h ?? measuredH) - BORDER_WIDTH;

    createSVGElement("rect", {
      "x": rectX,
      "y": rectY,
      "width": rectWidth,
      "height": rectHeight,
      "rx": RECT_RADIUS,
      "fill": this.parseColor(properties?.color, "255,255,255"),
      "fill-opacity": properties?.backgroundAlpha ?? 1,
      "stroke": this.parseColor(properties?.borderColor, "0,0,0"),
      "stroke-width": BORDER_WIDTH,
    }, container);
  }

  addText(
    control: Control,
    container: HTMLElement | undefined,
    textColor: string,
    align: string,
  ): void {
    const textContent = control.properties.text ?? "";
    const xPosition = Number.parseInt(control.x);
    const yPosition = Number.parseInt(control.y);
    const fontProperties = this.parseFontProperties(control);
    const textMetrics = this.measureText(
      textContent,
        `${fontProperties.style} ${fontProperties.weight} ${fontProperties.size} ${fontProperties.family}`,
    );

    const textX = align === "center" ? xPosition + (Number.parseInt(String(control.w)) ?? Number.parseInt(String(control.measuredW))) / 2 - textMetrics.width / 2 : xPosition;
    const textY = yPosition + Number.parseInt(String(control.measuredH)) / 2 + textMetrics.actualBoundingBoxAscent / 2;

    const textElement = createSVGElement("text", {
      "x": textX,
      "y": textY,
      "fill": textColor,
      "font-style": fontProperties.style,
      "font-weight": fontProperties.weight,
      "font-size": fontProperties.size,
    }, container);

    if (!textContent.includes("{color:")) {
      const tspanElement = createSVGElement("tspan", {}, textElement);
      tspanElement.textContent = textContent;
      return;
    }

    textContent.split(/{color:|{color}/).forEach((part) => {
      if (part.includes("}")) {
        let [colorCode, remainingText] = part.split("}");
        if (!colorCode.startsWith("#")) {
          const colorIndex = Number.parseInt(colorCode.slice(-1));
          // eslint-disable-next-line ts/ban-ts-comment
          // @ts-expect-error
          colorCode = Number.isNaN(colorIndex) ? DEFAULT_COLORS[colorCode][5] : DEFAULT_COLORS[colorCode][colorIndex];
        }
        const tspanElement = createSVGElement("tspan", { fill: colorCode }, textElement);
        tspanElement.textContent = remainingText;
      } else {
        const tspanElement = createSVGElement("tspan", {}, textElement);
        tspanElement.textContent = part;
      }
    });
  }

  TextArea(control: Control, container: HTMLElement | undefined): void {
    this.drawRectangle(control, container);
  }

  Canvas(control: Control, container: HTMLElement | undefined): void {
    this.drawRectangle(control, container);
  }

  Label(control: Control, container: HTMLElement | undefined): void {
    this.addText(
      control,
      container,
      this.parseColor(control.properties?.color, "0,0,0"),
      "left",
    );
  }

  TextInput(control: Control, container: HTMLElement | undefined): void {
    this.drawRectangle(control, container);
    this.addText(
      control,
      container,
      this.parseColor(control.properties?.textColor, "0,0,0"),
      "center",
    );
  }

  Arrow(control: Control, container: HTMLElement | undefined): void {
    const { x, y, properties: { p0: startPoint, p1: controlPoint, p2: endPoint, stroke: lineStyle, color } } = control;
    const strokeWidth = ARROW_WIDTH;
    let dashArray = "";

    if (lineStyle === "dotted") {
      dashArray = "0.8 12";
    } else if (lineStyle === "dashed") {
      dashArray = "28 46";
    }

    const l = { x: (endPoint.x - startPoint.x) * controlPoint.x, y: (endPoint.y - startPoint.y) * controlPoint.x };

    createSVGElement("path", {
      "d": `M${Number.parseInt(x) + startPoint.x} ${Number.parseInt(y) + startPoint.y}Q${Number.parseInt(x) + startPoint.x + l.x + l.y * controlPoint.y * 3.6} ${Number.parseInt(y) + startPoint.y + l.y + -l.x * controlPoint.y * 3.6} ${Number.parseInt(x) + endPoint.x} ${Number.parseInt(y) + endPoint.y}`,
      "fill": "none",
      "stroke": this.parseColor(color, "0,0,0"),
      "stroke-width": strokeWidth,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-dasharray": dashArray,
    }, container);
  }

  Icon(control: Control, container: HTMLElement | undefined): void {
    const { x, y, properties: { color, icon: { ID } } } = control;
    const circleRadius = 10;

    createSVGElement("circle", {
      cx: Number.parseInt(x) + circleRadius,
      cy: Number.parseInt(y) + circleRadius,
      r: circleRadius,
      fill: this.parseColor(color, "0,0,0"),
    }, container);

    if (ID === "check-circle") {
      createSVGElement("path", {
        "d": `M${Number.parseInt(x) + 4.5} ${Number.parseInt(y) + circleRadius}L${Number.parseInt(x) + 8.5} ${Number.parseInt(y) + circleRadius + 4} ${Number.parseInt(x) + 15} ${Number.parseInt(y) + circleRadius - 2.5}`,
        "fill": "none",
        "stroke": "#fff",
        "stroke-width": 3.5,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      }, container);
    }
  }

  HRule(control: Control, container: HTMLElement | undefined): void {
    const { x, y, properties: { stroke: lineStyle, color } } = control;
    const strokeWidth = BORDER_WIDTH;
    let dashArray = "";

    if (lineStyle === "dotted") {
      dashArray = "0.8, 8";
    } else if (lineStyle === "dashed") {
      dashArray = "18, 30";
    }

    createSVGElement("path", {
      "d": `M${x} ${y}L${Number.parseInt(x) + Number.parseInt(control.w ?? control.measuredW)} ${y}`,
      "fill": "none",
      "stroke": this.parseColor(color, "0,0,0"),
      "stroke-width": strokeWidth,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-dasharray": dashArray,
    }, container);
  }

  __group__(control: Control, container: any): void {
    const groupName = control?.properties?.controlName || "";
    const groupElement = createSVGElement("g", groupName
      ? {
          "class": "clickable-group",
          "data-group-id": groupName,
        }
      : {}, container);

    control?.children?.controls.control.sort((a: any, b: any) => a.zOrder - b.zOrder).forEach((child: any) => {
      child.x = Number.parseInt(child.x, 10) + Number.parseInt(control.x, 10);
      child.y = Number.parseInt(child.y, 10) + Number.parseInt(control.y, 10);
      this.render(child, groupElement);
    });
  }
}

export async function wireframeJSONToSVG(wireframe: Wireframe, options: { padding?: number; fontFamily?: string; fontURL?: string } = {}): Promise<SVGElement> {
  options = {
    padding: 5,
    fontFamily: "sans-serif",
    fontURL: "",
    ...options,
  };

  if (options.fontURL) {
    const font = new FontFace(options.fontFamily!, `url(${options.fontURL})`);
    await font.load();
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-expect-error
    if (document.fonts.add) {
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-expect-error
      document.fonts.add(font);
    }
  }

  const mockup = wireframe.mockup;
  const padding = options.padding!;
  const paddingRight = Number.parseInt(String(mockup.measuredW)) - Number.parseInt(String(mockup.mockupW)) - padding;
  const paddingBottom = Number.parseInt(String(mockup.measuredH)) - Number.parseInt(String(mockup.mockupH)) - padding;
  const svgWidth = Number.parseInt(String(mockup.mockupW)) + padding * 2;
  const svgHeight = Number.parseInt(String(mockup.mockupH)) + padding * 2;

  const svgElement = createSVGElement("svg", {
    "xmlns": "http://www.w3.org/2000/svg",
    "xmlns:xlink": "http://www.w3.org/1999/xlink",
    "viewBox": `${paddingRight} ${paddingBottom} ${svgWidth} ${svgHeight}`,
    "style": `font-family: ${options.fontFamily}`,
  });

  const renderer = new Renderer(svgElement, options.fontFamily!);

  mockup.controls.control.sort((a: any, b: any) => a.zOrder - b.zOrder).forEach((control: Control) => {
    renderer.render(control, svgElement);
  });

  return svgElement;
}
