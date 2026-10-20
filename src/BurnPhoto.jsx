import { useEffect, useRef } from 'react'

/*
  Foto que queima como papel de seda.
  - Mouse em cima: a queima avança a partir do ponto de entrada.
  - Mouse sai: a queima retrocede suavemente.
  - Celular: toque na foto liga/desliga.
  - Sem WebGL ou com "reduzir movimento": a foto só some/volta com fade.
*/

// Ajustes rápidos
const BURN_SECONDS = 2.8 // tempo para queimar tudo
const RESTORE_SECONDS = 1.8 // tempo para voltar ao normal
const EDGE = 0.075 // espessura da brasa

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uProgress;
uniform float uTime;
uniform float uAspect;
uniform float uMaxD;
uniform float uEdge;
uniform vec2 uOrigin;
uniform vec2 uCover;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 tuv = (vUv - 0.5) * uCover + 0.5;
  vec3 photo = texture2D(uTex, tuv).rgb;
  if (uProgress < 0.0005) {
    gl_FragColor = vec4(photo, 1.0);
    return;
  }

  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  vec2 o = vec2(uOrigin.x * uAspect, uOrigin.y);
  float dn = distance(p, o) / uMaxD;
  float n = clamp((fbm(p * 6.0 + 3.7) - 0.2) / 0.55, 0.0, 1.0);
  float f = dn * 0.64 + n * 0.36;
  float fine = vnoise(p * 38.0);

  float W = uEdge;
  float t = uProgress * (1.0 + 2.4 * W);
  float d = f - t + (fine - 0.5) * 0.035;

  // parte já queimada fica transparente (mostra o fundo preto)
  float a = smoothstep(-W - 0.012, -W + 0.004, d);

  // brasa: escura na parte queimada, vermelha e quase branca na frente
  float k = clamp((d + W) / W, 0.0, 1.0);
  float flick = vnoise(p * 28.0 + vec2(uTime * 0.9, -uTime * 1.7));
  vec3 red = vec3(1.0, 0.141, 0.0);
  vec3 ember = mix(vec3(0.04, 0.0, 0.01), red, smoothstep(0.05, 0.55, k));
  ember = mix(ember, vec3(1.0, 0.86, 0.82), smoothstep(0.8, 1.0, k) * 0.85);
  ember *= 0.75 + 0.6 * flick;

  // lado da foto: escurece perto da frente e recebe brilho vermelho
  float sc = 1.0 - smoothstep(0.0, 0.07, d);
  vec3 scorched = photo * (1.0 - 0.88 * sc) + red * 0.22 * sc;
  float glow = (1.0 - smoothstep(0.0, 0.18, d)) * 0.32;
  vec3 pc = scorched + red * glow;

  float m = smoothstep(-0.008, 0.008, d);
  vec3 col = mix(ember, pc, m);
  gl_FragColor = vec4(col * a, a);
}`

export default function BurnPhoto({ src, alt }) {
  const wrapRef = useRef(null)
  const imgRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const img = imgRef.current
    const canvas = canvasRef.current

    const st = {
      progress: 0,
      target: 0,
      v: 0,
      raf: 0,
      last: 0,
      origin: [0.5, 0.5],
      lastType: 'mouse',
      inited: false,
      failed: false,
      gl: null,
      u: {},
      ro: null,
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function setOrigin(x, y) {
      st.origin = [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))]
      if (!st.gl) return
      const { gl, u } = st
      const aspect = canvas.width / canvas.height
      const [ox, oy] = st.origin
      // distância até o canto mais distante, para a queima terminar exatamente em 100%
      const dx = Math.max(ox, 1 - ox) * aspect
      const dy = Math.max(oy, 1 - oy)
      gl.uniform2f(u.uOrigin, ox, oy)
      gl.uniform1f(u.uMaxD, Math.hypot(dx, dy))
    }

    function resize() {
      const { gl, u } = st
      const r = canvas.getBoundingClientRect()
      if (!r.width || !r.height) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(r.width * dpr))
      canvas.height = Math.max(1, Math.round(r.height * dpr))
      gl.viewport(0, 0, canvas.width, canvas.height)
      const ca = r.width / r.height
      const ia = img.naturalWidth / img.naturalHeight
      // equivalente ao object-fit: cover
      const cover = ca > ia ? [1, ia / ca] : [ca / ia, 1]
      gl.uniform1f(u.uAspect, canvas.width / canvas.height)
      gl.uniform2f(u.uCover, cover[0], cover[1])
      setOrigin(st.origin[0], st.origin[1])
    }

    function init() {
      if (st.inited) return !st.failed
      if (reduce) {
        st.inited = true
        st.failed = true
        return false
      }
      if (!img.complete || !img.naturalWidth) return false // imagem ainda carregando
      st.inited = true

      const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false })
      if (!gl) {
        st.failed = true
        return false
      }
      const compile = (type, code) => {
        const sh = gl.createShader(type)
        gl.shaderSource(sh, code)
        gl.compileShader(sh)
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
          console.warn(gl.getShaderInfoLog(sh))
          return null
        }
        return sh
      }
      const vs = compile(gl.VERTEX_SHADER, VERT)
      const fs = compile(gl.FRAGMENT_SHADER, FRAG)
      if (!vs || !fs) {
        st.failed = true
        return false
      }
      const prog = gl.createProgram()
      gl.attachShader(prog, vs)
      gl.attachShader(prog, fs)
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        st.failed = true
        return false
      }
      gl.useProgram(prog)

      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
      const loc = gl.getAttribLocation(prog, 'aPos')
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

      const tex = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

      st.gl = gl
      for (const name of ['uTex', 'uProgress', 'uTime', 'uAspect', 'uMaxD', 'uEdge', 'uOrigin', 'uCover']) {
        st.u[name] = gl.getUniformLocation(prog, name)
      }
      gl.uniform1i(st.u.uTex, 0)
      gl.uniform1f(st.u.uEdge, EDGE)
      resize()

      st.ro = new ResizeObserver(() => {
        resize()
        if (st.progress > 0.0005) draw(performance.now())
      })
      st.ro.observe(canvas)
      return true
    }

    function draw(now) {
      const { gl, u } = st
      gl.uniform1f(u.uProgress, st.progress)
      gl.uniform1f(u.uTime, now / 1000)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    function frame(now) {
      const dt = Math.min((now - st.last) / 1000, 0.05)
      st.last = now

      const dir = st.target - st.progress
      let vt = 0
      if (Math.abs(dir) > 0.0005) vt = dir > 0 ? 1 / BURN_SECONDS : -1 / RESTORE_SECONDS
      // a velocidade acelera e desacelera suavemente, inclusive ao inverter o sentido
      st.v += (vt - st.v) * (1 - Math.exp(-dt * 9))
      st.progress += st.v * dt

      if ((dir > 0 && st.progress >= st.target) || (dir < 0 && st.progress <= st.target)) {
        st.progress = st.target
        st.v = 0
      }
      st.progress = Math.min(1, Math.max(0, st.progress))

      wrap.classList.toggle('is-burning', st.progress > 0.0005)
      draw(now)

      const moving = Math.abs(st.target - st.progress) > 0.0005
      const ember = st.progress > 0.0005 && st.progress < 0.999 // brasa pisca enquanto houver frente
      st.raf = moving || ember ? requestAnimationFrame(frame) : 0
    }

    function burnTo(value) {
      if (!init()) {
        // fallback: só um fade
        wrap.classList.toggle('is-burned', value === 1)
        return
      }
      st.target = value
      if (!st.raf) {
        st.last = performance.now()
        st.raf = requestAnimationFrame(frame)
      }
    }

    function originFrom(e) {
      const r = canvas.getBoundingClientRect()
      if (st.progress < 0.01 && r.width && r.height) {
        setOrigin((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height)
      }
    }

    const onDown = (e) => {
      st.lastType = e.pointerType
    }
    const onEnter = (e) => {
      if (e.pointerType === 'touch') return
      st.lastType = e.pointerType
      if (init()) originFrom(e)
      burnTo(1)
    }
    const onLeave = (e) => {
      if (e.pointerType === 'touch') return
      burnTo(0)
    }
    const onClick = (e) => {
      if (st.lastType !== 'touch') return
      if (init()) originFrom(e)
      burnTo(st.target === 1 || wrap.classList.contains('is-burned') ? 0 : 1)
    }
    const onFocus = () => {
      if (wrap.matches(':focus-visible')) burnTo(1)
    }
    const onBlur = () => burnTo(0)

    wrap.addEventListener('pointerdown', onDown)
    wrap.addEventListener('pointerenter', onEnter)
    wrap.addEventListener('pointerleave', onLeave)
    wrap.addEventListener('click', onClick)
    wrap.addEventListener('focus', onFocus)
    wrap.addEventListener('blur', onBlur)

    return () => {
      wrap.removeEventListener('pointerdown', onDown)
      wrap.removeEventListener('pointerenter', onEnter)
      wrap.removeEventListener('pointerleave', onLeave)
      wrap.removeEventListener('click', onClick)
      wrap.removeEventListener('focus', onFocus)
      wrap.removeEventListener('blur', onBlur)
      cancelAnimationFrame(st.raf)
      if (st.ro) st.ro.disconnect()
      if (st.gl) {
        const ext = st.gl.getExtension('WEBGL_lose_context')
        if (ext) ext.loseContext()
      }
    }
  }, [])

  return (
    <div className="artist-photo" ref={wrapRef} tabIndex={0}>
      <img ref={imgRef} src={src} alt={alt} />
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  )
}
