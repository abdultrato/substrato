class TaxAuthority:
    def send_invoice(self, data):
        pass


AutoridadeFiscal = TaxAuthority
TaxAuthority.enviar_fatura = TaxAuthority.send_invoice
