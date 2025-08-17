/**
 * WebGL-accelerated renderer for high-performance animation rendering
 */

import { WebGLManager, ResourcePool } from '../../utils/performance';

export interface RenderObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  color: [number, number, number, number];
  texture?: WebGLTexture;
}

export interface RenderBatch {
  objects: RenderObject[];
  blendMode: 'normal' | 'add' | 'multiply' | 'screen';
  shader: string;
}

export class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private contextId: string;
  private shaderPrograms: Map<string, WebGLProgram> = new Map();
  private buffers: Map<string, WebGLBuffer> = new Map();
  private textures: Map<string, WebGLTexture> = new Map();
  private frameBuffer: WebGLFramebuffer | null = null;
  private renderTargetTexture: WebGLTexture | null = null;
  
  // Resource pools for performance
  private vertexPool = new ResourcePool<Float32Array>(
    () => new Float32Array(1024),
    (array) => array.fill(0)
  );
  
  private indexPool = new ResourcePool<Uint16Array>(
    () => new Uint16Array(512),
    (array) => array.fill(0)
  );

  // Shader sources
  private static readonly VERTEX_SHADER_SOURCE = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    attribute vec4 a_color;
    attribute mat3 a_transform;
    
    uniform mat3 u_projection;
    uniform float u_opacity;
    
    varying vec2 v_texCoord;
    varying vec4 v_color;
    
    void main() {
      vec3 position = u_projection * a_transform * vec3(a_position, 1.0);
      gl_Position = vec4(position.xy, 0.0, 1.0);
      
      v_texCoord = a_texCoord;
      v_color = a_color * u_opacity;
    }
  `;

  private static readonly FRAGMENT_SHADER_SOURCE = `
    precision mediump float;
    
    uniform sampler2D u_texture;
    uniform bool u_hasTexture;
    
    varying vec2 v_texCoord;
    varying vec4 v_color;
    
    void main() {
      vec4 color = v_color;
      
      if (u_hasTexture) {
        vec4 texColor = texture2D(u_texture, v_texCoord);
        color = color * texColor;
      }
      
      gl_FragColor = color;
    }
  `;

  constructor(canvas: HTMLCanvasElement, options?: WebGLContextAttributes) {
    this.canvas = canvas;
    this.contextId = `renderer-${Date.now()}`;
    
    const webglManager = WebGLManager.getInstance();
    const context = webglManager.createContext(canvas, this.contextId, {
      alpha: true,
      antialias: true,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      ...options,
    });

    if (!context) {
      throw new Error('Failed to create WebGL context');
    }

    this.gl = context;
    this.initialize();
  }

  private initialize(): void {
    const { gl } = this;

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Create default shader program
    this.createShaderProgram('default', 
      WebGLRenderer.VERTEX_SHADER_SOURCE, 
      WebGLRenderer.FRAGMENT_SHADER_SOURCE
    );

    // Create vertex buffer
    const vertexBuffer = gl.createBuffer();
    if (vertexBuffer) {
      this.buffers.set('vertex', vertexBuffer);
    }

    // Create index buffer
    const indexBuffer = gl.createBuffer();
    if (indexBuffer) {
      this.buffers.set('index', indexBuffer);
    }

    // Create framebuffer for render-to-texture
    this.frameBuffer = gl.createFramebuffer();
    this.renderTargetTexture = gl.createTexture();

    if (this.frameBuffer && this.renderTargetTexture) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
      gl.bindTexture(gl.TEXTURE_2D, this.renderTargetTexture);
      
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.canvas.width, this.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.renderTargetTexture, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }

  private createShaderProgram(name: string, vertexSource: string, fragmentSource: string): WebGLProgram | null {
    const { gl } = this;

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) {
      return null;
    }

    const program = gl.createProgram();
    if (!program) {
      return null;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader program linking failed:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    // Clean up shaders
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    this.shaderPrograms.set(name, program);
    return program;
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const { gl } = this;

    const shader = gl.createShader(type);
    if (!shader) {
      return null;
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  public createTexture(image: HTMLImageElement | HTMLCanvasElement | ImageData): WebGLTexture | null {
    const { gl } = this;

    const texture = gl.createTexture();
    if (!texture) {
      return null;
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    if (image instanceof ImageData) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image.data);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }

    // Set texture parameters for better quality
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
  }

  public render(batches: RenderBatch[]): void {
    const { gl } = this;

    // Clear the canvas
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Create projection matrix
    const projectionMatrix = this.createProjectionMatrix();

    for (const batch of batches) {
      this.renderBatch(batch, projectionMatrix);
    }
  }

  private renderBatch(batch: RenderBatch, projectionMatrix: Float32Array): void {
    const { gl } = this;
    const program = this.shaderPrograms.get(batch.shader) || this.shaderPrograms.get('default');
    
    if (!program) {
      return;
    }

    gl.useProgram(program);

    // Set uniforms
    const projectionLocation = gl.getUniformLocation(program, 'u_projection');
    if (projectionLocation) {
      gl.uniformMatrix3fv(projectionLocation, false, projectionMatrix);
    }

    // Set blend mode
    this.setBlendMode(batch.blendMode);

    // Prepare vertex data
    const vertexData = this.prepareVertexData(batch.objects);
    const indexData = this.prepareIndexData(batch.objects.length);

    // Upload vertex data
    const vertexBuffer = this.buffers.get('vertex');
    if (vertexBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);
    }

    // Upload index data
    const indexBuffer = this.buffers.get('index');
    if (indexBuffer) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.DYNAMIC_DRAW);
    }

    // Set up vertex attributes
    this.setupVertexAttributes(program);

    // Draw
    gl.drawElements(gl.TRIANGLES, batch.objects.length * 6, gl.UNSIGNED_SHORT, 0);

    // Clean up
    this.vertexPool.release(vertexData);
    this.indexPool.release(indexData);
  }

  private prepareVertexData(objects: RenderObject[]): Float32Array {
    const vertexData = this.vertexPool.acquire();
    let offset = 0;

    for (const obj of objects) {
      // Calculate transform matrix
      const transform = this.createTransformMatrix(obj);
      
      // Vertex positions (quad)
      const positions = [
        0, 0,           // top-left
        obj.width, 0,   // top-right
        obj.width, obj.height, // bottom-right
        0, obj.height   // bottom-left
      ];

      // Texture coordinates
      const texCoords = [
        0, 0,  // top-left
        1, 0,  // top-right
        1, 1,  // bottom-right
        0, 1   // bottom-left
      ];

      // Pack vertex data: position(2) + texCoord(2) + color(4) + transform(9) = 17 floats per vertex
      for (let i = 0; i < 4; i++) {
        const vertexOffset = offset + i * 17;
        
        // Position
        vertexData[vertexOffset] = positions[i * 2];
        vertexData[vertexOffset + 1] = positions[i * 2 + 1];
        
        // Texture coordinates
        vertexData[vertexOffset + 2] = texCoords[i * 2];
        vertexData[vertexOffset + 3] = texCoords[i * 2 + 1];
        
        // Color
        vertexData[vertexOffset + 4] = obj.color[0];
        vertexData[vertexOffset + 5] = obj.color[1];
        vertexData[vertexOffset + 6] = obj.color[2];
        vertexData[vertexOffset + 7] = obj.color[3] * obj.opacity;
        
        // Transform matrix (3x3 flattened)
        for (let j = 0; j < 9; j++) {
          vertexData[vertexOffset + 8 + j] = transform[j];
        }
      }

      offset += 4 * 17; // 4 vertices * 17 floats per vertex
    }

    return vertexData;
  }

  private prepareIndexData(objectCount: number): Uint16Array {
    const indexData = this.indexPool.acquire();
    
    for (let i = 0; i < objectCount; i++) {
      const baseVertex = i * 4;
      const baseIndex = i * 6;
      
      // Two triangles per quad
      indexData[baseIndex] = baseVertex;
      indexData[baseIndex + 1] = baseVertex + 1;
      indexData[baseIndex + 2] = baseVertex + 2;
      indexData[baseIndex + 3] = baseVertex;
      indexData[baseIndex + 4] = baseVertex + 2;
      indexData[baseIndex + 5] = baseVertex + 3;
    }

    return indexData;
  }

  private createTransformMatrix(obj: RenderObject): Float32Array {
    const { x, y, scaleX, scaleY, rotation } = obj;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    return new Float32Array([
      scaleX * cos, scaleX * -sin, x,
      scaleY * sin, scaleY * cos,  y,
      0,            0,             1
    ]);
  }

  private createProjectionMatrix(): Float32Array {
    const { width, height } = this.canvas;
    
    return new Float32Array([
      2 / width, 0,          -1,
      0,         -2 / height, 1,
      0,         0,           1
    ]);
  }

  private setBlendMode(mode: string): void {
    const { gl } = this;

    switch (mode) {
      case 'add':
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        break;
      case 'multiply':
        gl.blendFunc(gl.DST_COLOR, gl.ZERO);
        break;
      case 'screen':
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
        break;
      default: // normal
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        break;
    }
  }

  private setupVertexAttributes(program: WebGLProgram): void {
    const { gl } = this;
    const stride = 17 * 4; // 17 floats * 4 bytes per float

    // Position attribute
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    if (positionLocation >= 0) {
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);
    }

    // Texture coordinate attribute
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    if (texCoordLocation >= 0) {
      gl.enableVertexAttribArray(texCoordLocation);
      gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, stride, 2 * 4);
    }

    // Color attribute
    const colorLocation = gl.getAttribLocation(program, 'a_color');
    if (colorLocation >= 0) {
      gl.enableVertexAttribArray(colorLocation);
      gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, stride, 4 * 4);
    }

    // Transform matrix attribute (3x3 matrix as 3 vec3 attributes)
    for (let i = 0; i < 3; i++) {
      const transformLocation = gl.getAttribLocation(program, `a_transform[${i}]`);
      if (transformLocation >= 0) {
        gl.enableVertexAttribArray(transformLocation);
        gl.vertexAttribPointer(transformLocation, 3, gl.FLOAT, false, stride, (8 + i * 3) * 4);
      }
    }
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Update render target texture
    if (this.renderTargetTexture) {
      const { gl } = this;
      gl.bindTexture(gl.TEXTURE_2D, this.renderTargetTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
  }

  public dispose(): void {
    const { gl } = this;

    // Clean up resources
    this.shaderPrograms.forEach(program => gl.deleteProgram(program));
    this.buffers.forEach(buffer => gl.deleteBuffer(buffer));
    this.textures.forEach(texture => gl.deleteTexture(texture));
    
    if (this.frameBuffer) {
      gl.deleteFramebuffer(this.frameBuffer);
    }
    
    if (this.renderTargetTexture) {
      gl.deleteTexture(this.renderTargetTexture);
    }

    // Clear resource pools
    this.vertexPool.clear();
    this.indexPool.clear();

    // Destroy WebGL context
    const webglManager = WebGLManager.getInstance();
    webglManager.destroyContext(this.contextId);
  }
}
